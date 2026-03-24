import { supabase } from '../lib/supabase';

export const analyticsService = {
  /**
   * Get sales dashboard metrics
   */
  async getSalesMetrics(startDate, endDate) {
    try {
      // Total sales
      const { data: salesData, error: salesError } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Total deliveries
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select('id, status, delivered_at')
        .gte('delivered_at', startDate.toISOString())
        .lte('delivered_at', endDate.toISOString());

      const totalSales = salesData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      const completedOrders = salesData.filter(o => o.status === 'Completed').length;

      return {
        success: true,
        totalSales,
        totalOrders: salesData.length,
        completedOrders,
        completionRate: salesData.length > 0 ? (completedOrders / salesData.length * 100).toFixed(2) : 0,
        totalDeliveries: deliveriesData?.length || 0,
        avgOrderValue: salesData.length > 0 ? (totalSales / salesData.length).toFixed(2) : 0
      };
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

      // Group by date
      const grouped = data.reduce((acc, order) => {
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

      const products = data.reduce((acc, item) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            name: item.products?.name,
            category: item.products?.category,
            quantity: 0,
            revenue: 0
          };
        }
        acc[productId].quantity += item.quantity;
        acc[productId].revenue += parseFloat(item.price_at_order || 0) * item.quantity;
        return acc;
      }, {});

      return {
        success: true,
        data: Object.values(products)
      };
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
        .select('id, status, assigned_at, delivered_at, attempt_count')
        .gte('assigned_at', startDate.toISOString())
        .lte('assigned_at', endDate.toISOString());

      if (error) throw error;

      const metrics = {
        total: data.length,
        completed: data.filter(d => d.status === 'delivered').length,
        failed: data.filter(d => d.status === 'failed').length,
        avgAttempts: data.reduce((sum, d) => sum + (d.attempt_count || 0), 0) / data.length || 0
      };

      metrics.successRate = data.length > 0 ? ((metrics.completed / data.length) * 100).toFixed(2) : 0;

      return { success: true, data: metrics };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get customer metrics
   */
  async getCustomerMetrics() {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, created_at')
        .eq('role', 'customer');

      if (profilesError) throw profilesError;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('user_id');

      const totalCustomers = profilesData.length;
      const activeCustomers = new Set(ordersData?.map(o => o.user_id)).size;
      const newCustomersThisMonth = profilesData.filter(c => {
        const createdDate = new Date(c.created_at);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && 
               createdDate.getFullYear() === now.getFullYear();
      }).length;

      return {
        success: true,
        data: {
          totalCustomers,
          activeCustomers,
          newCustomersThisMonth,
          customerRetentionRate: totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(2) : 0
        }
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

      const distribution = data.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      return { success: true, data: distribution };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Export report to CSV
   */
  async exportToCSV(data, filename = 'report.csv') {
    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Export to PDF (requires pdfkit or similar)
   */
  async exportToPDF(data, filename = 'report.pdf') {
    try {
      // This would require a PDF library like pdfkit
      // For now, return a placeholder
      console.warn('PDF export requires pdfkit library');
      return { success: false, error: 'PDF export not configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
