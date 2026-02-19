// src/services/orderService.js
import { supabase } from '../lib/supabase';

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

  async updateStatus(orderId, status) {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (error) throw error;
  },

  async getStats() {
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
  }
};