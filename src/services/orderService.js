// src/services/orderService.js
import { supabase } from '../lib/supabase';
import { ORDER_STATUS } from '../utils/constants'; // ADD THIS IMPORT

export const orderService = {
  async getAll() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (full_name, phone_number, address),
        order_items (
          id,
          quantity,
          price_at_order,
          products (
            id,
            name,
            unit,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (full_name, phone_number, address),
        order_items (
          id,
          quantity,
          price_at_order,
          products (
            id,
            name,
            unit,
            image_url,
            description
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(orderId, status, options = {}) {
    const {
      cancellationReason = null,
      cancellationNote = null,
      cancelledBy = null
    } = options;

    const updatePayload = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === ORDER_STATUS.CANCELLED) {
      const reasonText = cancellationReason === 'Other' && cancellationNote
        ? `Other: ${cancellationNote}`
        : cancellationReason;

      updatePayload.cancellation_reason = reasonText || 'Unspecified';
      updatePayload.cancelled_by = cancelledBy;
      updatePayload.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);
    
    if (error) throw error;
  },

  async updateDeliveryFee(orderId, deliveryFee) {
    const { error } = await supabase
      .from('orders')
      .update({ 
        delivery_fee: deliveryFee,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;
  },

  async getStats() {
    // Primary path: single RPC call (see migration 020_dashboard_stats_rpc.sql)
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_dashboard_stats');

      if (!rpcError && rpcData && rpcData.length > 0) {
        const row = rpcData[0];
        return {
          totalRevenue: Number(row.total_revenue) || 0,
          todayRevenue: Number(row.today_revenue) || 0,
          pendingOrders: Number(row.pending_orders) || 0,
          processingOrders: Number(row.processing_orders) || 0,
          completedOrders: Number(row.completed_orders) || 0,
          lowStock: Number(row.low_stock) || 0
        };
      }
    } catch (rpcErr) {
      console.warn('Dashboard RPC unavailable, falling back to multi-query stats:', rpcErr?.message || rpcErr);
    }

    // Fallback path: original multi-query approach (6 round trips)
    try {
      const [revenueData, pendingCount, processingCount, completedCount, lowStockData] = await Promise.all([
        supabase.from('orders').select('total_amount').eq('status', ORDER_STATUS.COMPLETED),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', ORDER_STATUS.PENDING),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', ORDER_STATUS.PROCESSING),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', ORDER_STATUS.COMPLETED),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock_quantity', 10)
      ]);
      
      // Get today's completed orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayCompleted } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', ORDER_STATUS.COMPLETED)
        .gte('created_at', today.toISOString());
      
      const totalRevenue = revenueData.data?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
      const todayRevenue = todayCompleted?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
      
      return {
        totalRevenue,
        todayRevenue,
        pendingOrders: pendingCount.count || 0,
        processingOrders: processingCount.count || 0,
        completedOrders: completedCount.count || 0,
        lowStock: lowStockData.count || 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalRevenue: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: 0,
        lowStock: 0
      };
    }
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('orders-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  async autoDispatchOrderIfEnabled(orderId) {
    try {
      const { settingsService } = await import('./settingsService');
      const settings = await settingsService.getAutoDispatchSettings();
      
      if (!settings.enabled) {
        return { success: false, reason: 'Auto-dispatch is disabled in settings' };
      }

      const { data: riders, error: riderErr } = await supabase
        .from('profiles')
        .select('id, full_name, is_online')
        .eq('role', 'rider')
        .eq('is_online', true);

      if (riderErr || !riders || riders.length === 0) {
        return { success: false, reason: 'No online riders available' };
      }

      const { data: activeDeliveries } = await supabase
        .from('deliveries')
        .select('rider_id')
        .in('status', ['assigned', 'accepted', 'in_transit']);

      const countsMap = (activeDeliveries || []).reduce((acc, curr) => {
        if (curr.rider_id) {
          acc[curr.rider_id] = (acc[curr.rider_id] || 0) + 1;
        }
        return acc;
      }, {});

      const eligibleRiders = riders.filter(r => (countsMap[r.id] || 0) < settings.maxOrders);

      if (eligibleRiders.length === 0) {
        return { success: false, reason: 'All available riders are at maximum workload capacity' };
      }

      eligibleRiders.sort((a, b) => (countsMap[a.id] || 0) - (countsMap[b.id] || 0));
      const selectedRider = eligibleRiders[0];

      const { error: deliveryErr } = await supabase
        .from('deliveries')
        .insert([{
          order_id: orderId,
          rider_id: selectedRider.id,
          status: 'assigned',
          created_at: new Date().toISOString()
        }]);

      if (deliveryErr) throw deliveryErr;

      await this.updateStatus(orderId, ORDER_STATUS.PROCESSING);

      return { success: true, rider: selectedRider };
    } catch (err) {
      console.error('Error during auto-dispatch:', err);
      return { success: false, error: err.message };
    }
  }
};