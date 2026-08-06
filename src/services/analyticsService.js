// src/services/analyticsService.js
import { supabase } from '../lib/supabase';

export const analyticsService = {
  /**
   * Fetches comprehensive analytics for a given date range.
   * @param {Date} startDate
   * @param {Date} endDate
   */
  async getAnalyticsOverview(startDate, endDate) {
    try {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // Fetch orders in range with profiles and items
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

      // Fetch deliveries in range for delivery duration stats
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('id, status, assigned_at, delivered_at, rider_id')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (deliveriesError && deliveriesError.code !== 'PGRST116') {
        console.warn('Deliveries query notice:', deliveriesError);
      }

      const allOrders = orders || [];
      const completedOrders = allOrders.filter(o => o.status === 'Completed' || o.status === 'delivered');
      
      const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
      const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);
      const totalOrdersCount = allOrders.length;
      const completedCount = completedOrders.length;
      const completionRate = totalOrdersCount > 0 ? ((completedCount / totalOrdersCount) * 100).toFixed(1) : '0.0';
      const avgOrderValue = completedCount > 0 ? (totalSales / completedCount).toFixed(2) : '0.00';

      // 1. Payment Method Breakdown
      const paymentMethods = {};
      allOrders.forEach(o => {
        const method = (o.payment_method || 'Cash on Delivery').toUpperCase();
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      // 2. Order Status Distribution
      const statusDistribution = {};
      allOrders.forEach(o => {
        const status = o.status || 'Pending';
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      });

      // 3. Peak Hours of Day (0-23)
      const hourlyDistribution = Array(24).fill(0);
      allOrders.forEach(o => {
        if (o.created_at) {
          const hour = new Date(o.created_at).getHours();
          hourlyDistribution[hour] += 1;
        }
      });
      const peakHourIndex = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
      const peakHourLabel = `${peakHourIndex % 12 || 12}:00 ${peakHourIndex >= 12 ? 'PM' : 'AM'}`;

      // 4. Product Sales & Revenue Aggregation
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

      // 5. Daily Trend Chart Data
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

      // 6. Delivery Duration Stats (in minutes)
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
  },

  /**
   * Get sales dashboard metrics (legacy compatibility)
   */
  async getSalesMetrics(startDate, endDate) {
    const res = await this.getAnalyticsOverview(startDate, endDate);
    if (!res.success) return { success: false, error: res.error };
    return {
      success: true,
      totalSales: res.summary.totalSales,
      totalOrders: res.summary.totalOrdersCount,
      completedOrders: res.summary.completedCount,
      completionRate: res.summary.completionRate,
      avgOrderValue: res.summary.avgOrderValue,
    };
  },

  /**
   * Get daily sales data for chart
   */
  async getDailySalesData(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();
    const res = await this.getAnalyticsOverview(startDate, endDate);
    return { success: res.success, data: res.dailyTrend || [], error: res.error };
  },

  /**
   * Get product performance
   */
  async getProductPerformance() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    const res = await this.getAnalyticsOverview(startDate, endDate);
    return { success: res.success, data: res.topProducts || [], error: res.error };
  }
};
