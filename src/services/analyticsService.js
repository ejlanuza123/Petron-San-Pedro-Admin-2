// src/services/analyticsService.js
import { supabase } from '../lib/supabase';

export const analyticsService = {
  /**
   * Get sales dashboard metrics
   */
  async getSalesMetrics(startDate, endDate) {
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('id, status, delivered_at')
        .gte('delivered_at', startDate.toISOString())
        .lte('delivered_at', endDate.toISOString());

      const ordersList = salesData || [];
      const totalSales = ordersList.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      const completedOrders = ordersList.filter(o => o.status === 'Completed').length;

      return {
        success: true,
        totalSales,
        totalOrders: ordersList.length,
        completedOrders,
        completionRate: ordersList.length > 0 ? (completedOrders / ordersList.length * 100).toFixed(2) : '0.00',
        totalDeliveries: deliveriesData?.length || 0,
        avgOrderValue: ordersList.length > 0 ? (totalSales / ordersList.length).toFixed(2) : '0.00'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get order status distribution
   */
  async getOrderStatusDistribution() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status');

      if (error) throw error;

      const distribution = (data || []).reduce((acc, order) => {
        const status = order.status || 'Pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      return { success: true, data: distribution };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get daily sales data for chart
   */
  async getDailySalesData(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount, status')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped = (data || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toLocaleDateString('en-US');
        if (!acc[date]) {
          acc[date] = { sales: 0, orders: 0, completed: 0 };
        }
        acc[date].sales += parseFloat(order.total_amount || 0);
        acc[date].orders += 1;
        if (order.status === 'Completed') acc[date].completed += 1;
        return acc;
      }, {});

      const chartData = Object.entries(grouped).map(([date, metrics]) => ({
        date,
        ...metrics
      }));

      return { success: true, data: chartData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get delivery performance metrics
   */
  async getDeliveryMetrics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id, status, attempt_count, delivered_at')
        .gte('delivered_at', startDate.toISOString())
        .lte('delivered_at', endDate.toISOString());

      if (error) throw error;

      const deliveries = data || [];
      const total = deliveries.length;
      const completed = deliveries.filter(d => d.status === 'delivered' || d.status === 'Completed').length;
      const failed = deliveries.filter(d => d.status === 'failed').length;
      const totalAttempts = deliveries.reduce((sum, d) => sum + (d.attempt_count || 1), 0);

      return {
        success: true,
        data: {
          total,
          completed,
          failed,
          successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
          avgAttempts: total > 0 ? parseFloat((totalAttempts / total).toFixed(2)) : 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get customer metrics
   */
  async getCustomerMetrics() {
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, role, created_at')
        .eq('role', 'customer');

      if (pError) throw pError;

      const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('user_id');

      if (oError) throw oError;

      const totalCustomers = (profiles || []).length;
      const orderingUsers = new Set((orders || []).map(o => o.user_id));
      const activeCustomers = orderingUsers.size;

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const newCustomersThisMonth = (profiles || []).filter(p => new Date(p.created_at) >= firstDay).length;
      const retentionRate = totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(2) : '0.00';

      return {
        success: true,
        data: {
          totalCustomers,
          activeCustomers,
          newCustomersThisMonth,
          customerRetentionRate: retentionRate
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get product performance
   */
  async getProductPerformance() {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, price_at_order, products(name, category)')
        .order('quantity', { ascending: false })
        .limit(20);

      if (error) throw error;

      const productsMap = {};
      (data || []).forEach(item => {
        const pId = item.product_id;
        if (!productsMap[pId]) {
          productsMap[pId] = {
            name: item.products?.name || 'Product',
            category: item.products?.category || 'General',
            quantity: 0,
            revenue: 0
          };
        }
        const q = Number(item.quantity || 0);
        const p = parseFloat(item.price_at_order || 0);
        productsMap[pId].quantity += q;
        productsMap[pId].revenue += q * p;
      });

      return {
        success: true,
        data: Object.values(productsMap)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Export data to CSV
   */
  async exportToCSV(data, filename = 'export.csv') {
    try {
      if (!data || !data.length) return { success: false, error: 'No data to export' };
      const keys = Object.keys(data[0]);
      const csvLines = [
        keys.join(','),
        ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))
      ];
      const csvString = csvLines.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Export to PDF placeholder
   */
  async exportToPDF() {
    return { success: false, error: 'PDF export not configured' };
  },

  /**
   * Comprehensive overview method used by Reports.jsx
   */
  async getAnalyticsOverview(startDate, endDate) {
    try {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          delivery_fee,
          status,
          payment_method,
          created_at,
          user_id,
          profiles!orders_user_id_fkey (full_name),
          order_items (
            quantity,
            price_at_order,
            products (id, name, category)
          )
        `)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, status, assigned_at, delivered_at, rider_id')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const allOrders = orders || [];
      const completedOrders = allOrders.filter(o => o.status === 'Completed' || o.status === 'delivered');
      
      const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);
      const totalOrdersCount = allOrders.length;
      const completedCount = completedOrders.length;
      const completionRate = totalOrdersCount > 0 ? ((completedCount / totalOrdersCount) * 100).toFixed(1) : '0.0';
      const avgOrderValue = completedCount > 0 ? (totalSales / completedCount).toFixed(2) : '0.00';

      const paymentMethods = {};
      allOrders.forEach(o => {
        const method = (o.payment_method || 'Cash on Delivery').toUpperCase();
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      const statusDistribution = {};
      allOrders.forEach(o => {
        const status = o.status || 'Pending';
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      });

      const hourlyDistribution = Array(24).fill(0);
      allOrders.forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          hourlyDistribution[hour] += 1;
        }
      });
      const peakHourIndex = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
      const peakHourLabel = `${peakHourIndex % 12 || 12}:00 ${peakHourIndex >= 12 ? 'PM' : 'AM'}`;

      const productMap = {};
      const categoryMap = {};

      allOrders.forEach(o => {
        if (o.status !== 'Cancelled') {
          (o.order_items || []).forEach(item => {
            const pId = item.products?.id || item.product_id || 'unknown';
            const pName = item.products?.name || 'Product';
            const category = item.products?.category || 'General';
            const qty = Number(item.quantity || 1);
            const price = Number(item.price_at_order || item.products?.price || 0);
            const rev = qty * price;

            if (!productMap[pId]) {
              productMap[pId] = { id: pId, name: pName, category, quantity: 0, revenue: 0 };
            }
            productMap[pId].quantity += qty;
            productMap[pId].revenue += rev;

            if (!categoryMap[category]) {
              categoryMap[category] = { category, quantity: 0, revenue: 0 };
            }
            categoryMap[category].quantity += qty;
            categoryMap[category].revenue += rev;
          });
        }
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const categorySales = Object.values(categoryMap)
        .sort((a, b) => b.revenue - a.revenue);

      const dailyMap = {};
      allOrders.forEach(o => {
        const dateKey = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, sales: 0, orders: 0 };
        }
        if (o.status === 'Completed' || o.status === 'delivered') {
          dailyMap[dateKey].sales += Number(o.total_amount || 0);
        }
        dailyMap[dateKey].orders += 1;
      });
      const dailyTrend = Object.values(dailyMap);

      const validDeliveries = (deliveries || []).filter(d => d.delivered_at && d.assigned_at);
      const deliveryDurations = validDeliveries.map(d => (new Date(d.delivered_at) - new Date(d.assigned_at)) / 60000);
      const avgDeliveryMinutes = deliveryDurations.length > 0
        ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length)
        : null;

      return {
        success: true,
        summary: {
          totalSales,
          totalDeliveryFees,
          totalOrdersCount,
          completedCount,
          completionRate,
          avgOrderValue,
          peakHourLabel,
          avgDeliveryMinutes,
        },
        paymentMethods,
        statusDistribution,
        topProducts,
        categorySales,
        dailyTrend,
        rawOrders: allOrders,
      };
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      return { success: false, error: error.message };
    }
  }
};
