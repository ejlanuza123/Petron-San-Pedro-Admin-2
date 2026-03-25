import { supabase } from '../lib/supabase';

const buildAuditLog = (adminId, action, entityType, entityId, details = {}) => ({
  admin_id: adminId,
  action,
  entity_type: entityType,
  entity_id: String(entityId),
  details
});

const tryInsertAuditLogs = async (logs) => {
  const validLogs = (logs || []).filter((log) => Boolean(log?.admin_id));
  if (!validLogs.length) {
    return;
  }

  const { error } = await supabase.from('admin_logs').insert(validLogs);
  if (error) {
    // Audit failure should not rollback successful bulk operations.
    console.error('Failed to insert audit logs:', error);
  }
};

const resolveActorAdminId = async (adminId) => {
  if (adminId) {
    return adminId;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Failed to resolve actor admin id:', error);
    return null;
  }

  return data?.user?.id || null;
};

export const bulkOperationsService = {
  /**
   * Bulk update order status
   */
  async bulkUpdateOrderStatus(orderIds, newStatus, adminId) {
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) throw error;

      // Create audit logs for each update
      const auditLogs = orderIds.map((orderId) => buildAuditLog(
        actorAdminId,
        'UPDATE_ORDER_STATUS',
        'order',
        orderId,
        { oldStatus: 'previous_status', newStatus }
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: orderIds.length,
        message: `Updated ${orderIds.length} orders to ${newStatus}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk assign riders to deliveries
   */
  async bulkAssignRiders(deliveryIds, riderId, adminId) {
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const { error } = await supabase
        .from('deliveries')
        .update({
          rider_id: riderId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .in('id', deliveryIds);

      if (error) throw error;

      // Create notifications for rider
      const notifications = deliveryIds.map(deliveryId => ({
        user_id: riderId,
        type: 'order_status',
        title: 'New Deliveries Assigned',
        message: `You have been assigned ${deliveryIds.length} deliveries`,
        data: { deliveryIds }
      }));

      await supabase.from('notifications').insert(notifications);

      const auditLogs = deliveryIds.map((deliveryId) => buildAuditLog(
        actorAdminId,
        'ASSIGN_RIDER',
        'delivery',
        deliveryId,
        { riderId }
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: deliveryIds.length,
        message: `Assigned ${deliveryIds.length} deliveries to rider`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk cancel orders
   */
  async bulkCancelOrders(orderIds, cancellationReason, cancelledByUserId, adminId = cancelledByUserId) {
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'Cancelled',
          cancellation_reason: cancellationReason,
          cancelled_by: cancelledByUserId,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) throw error;

      // Get order details for notifications
      const { data: orders } = await supabase
        .from('orders')
        .select('user_id')
        .in('id', orderIds);

      // Create notifications
      if (orders) {
        const notifications = orders.map(order => ({
          user_id: order.user_id,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: `Your order has been cancelled. Reason: ${cancellationReason}`,
          data: { cancellationReason }
        }));

        await supabase.from('notifications').insert(notifications);
      }

      const auditLogs = orderIds.map((orderId) => buildAuditLog(
        actorAdminId,
        'CANCEL_ORDER',
        'order',
        orderId,
        { cancellationReason, cancelledByUserId }
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: orderIds.length,
        message: `Cancelled ${orderIds.length} orders`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk update product stock
   */
  async bulkUpdateStock(products, adminId) {
    // products = [{ id, adjustment }, ...]
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const updates = await Promise.all(
        products.map(({ id, adjustment }) =>
          supabase
            .from('products')
            .update({
              stock_quantity: supabase.sql`stock_quantity + ${adjustment}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
        )
      );

      const errors = updates.filter(u => u.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} products`);
      }

      const auditLogs = products.map(({ id, adjustment }) => buildAuditLog(
        actorAdminId,
        'UPDATE_PRODUCT_STOCK',
        'product',
        id,
        { adjustment }
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: products.length,
        message: `Updated stock for ${products.length} products`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk apply discount to products
   */
  async bulkApplyDiscount(productIds, discountPercentage, adminId) {
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, current_price')
        .in('id', productIds);

      if (fetchError) throw fetchError;

      const updates = products.map(product => ({
        id: product.id,
        discount_price: Math.round(product.current_price * (1 - discountPercentage / 100) * 100) / 100
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({
            discount_price: update.discount_price,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      const auditLogs = productIds.map((productId) => buildAuditLog(
        actorAdminId,
        'APPLY_PRODUCT_DISCOUNT',
        'product',
        productId,
        { discountPercentage }
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: productIds.length,
        message: `Applied ${discountPercentage}% discount to ${productIds.length} products`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk deactivate products
   */
  async bulkDeactivateProducts(productIds, adminId) {
    try {
      const actorAdminId = await resolveActorAdminId(adminId);
      const { error } = await supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', productIds);

      if (error) throw error;

      const auditLogs = productIds.map((productId) => buildAuditLog(
        actorAdminId,
        'DEACTIVATE_PRODUCT',
        'product',
        productId,
        {}
      ));
      await tryInsertAuditLogs(auditLogs);

      return {
        success: true,
        count: productIds.length,
        message: `Deactivated ${productIds.length} products`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Export selected items to CSV
   */
  async exportToCsv(data, filename) {
    try {
      if (!data || data.length === 0) {
        return { success: false, error: 'No data to export' };
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, message: 'Export completed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
