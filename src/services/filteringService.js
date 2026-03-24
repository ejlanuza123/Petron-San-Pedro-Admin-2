import { supabase } from '../lib/supabase';

export const filteringService = {
  /**
   * Build advanced order filters
   */
  async getFilteredOrders(filters = {}) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          user_id,
          total_amount,
          status,
          payment_method,
          created_at,
          delivery_address,
          customer_name,
          rider_id
        `, { count: 'est' });

      // Status filter
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Payment method filter
      if (filters.paymentMethod && filters.paymentMethod.length > 0) {
        query = query.in('payment_method', filters.paymentMethod);
      }

      // Date range filter
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      // Amount range filter
      if (filters.minAmount) {
        query = query.gte('total_amount', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte('total_amount', filters.maxAmount);
      }

      // Search by order number or customer name
      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      // Sorting
      const sortColumn = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortColumn, sortOrder);

      // Pagination
      const pageSize = filters.pageSize || 50;
      const pageNumber = filters.page || 0;
      const from = pageNumber * pageSize;
      const to = from + pageSize - 1;

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data,
        count,
        pageSize,
        currentPage: pageNumber,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Filter deliveries with advanced options
   */
  async getFilteredDeliveries(filters = {}) {
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          id,
          order_id,
          rider_id,
          status,
          assigned_at,
          delivered_at,
          attempt_count,
          profiles:rider_id(full_name)
        `, { count: 'est' });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.riderId) {
        query = query.eq('rider_id', filters.riderId);
      }

      if (filters.startDate) {
        query = query.gte('assigned_at', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('assigned_at', filters.endDate.toISOString());
      }

      if (filters.minAttempts) {
        query = query.gte('attempt_count', filters.minAttempts);
      }

      const sortColumn = filters.sortBy || 'assigned_at';
      const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortColumn, sortOrder);

      const pageSize = filters.pageSize || 50;
      const pageNumber = filters.page || 0;
      query = query.range(pageNumber * pageSize, (pageNumber + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data,
        count,
        pageSize,
        currentPage: pageNumber,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Filter products
   */
  async getFilteredProducts(filters = {}) {
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'est' });

      if (filters.category && filters.category.length > 0) {
        query = query.in('category', filters.category);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.minPrice) {
        query = query.gte('current_price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('current_price', filters.maxPrice);
      }

      if (filters.lowStockOnly) {
        query = query.lte('stock_quantity', query.from('products').select('low_stock_threshold'));
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const sortColumn = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortColumn, sortOrder);

      const pageSize = filters.pageSize || 50;
      const pageNumber = filters.page || 0;
      query = query.range(pageNumber * pageSize, (pageNumber + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data,
        count,
        pageSize,
        currentPage: pageNumber,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get filter options (for dropdowns)
   */
  async getFilterOptions() {
    try {
      const [ordersRes, productsRes, ridersRes] = await Promise.all([
        supabase.from('orders').select('status, payment_method'),
        supabase.from('products').select('category'),
        supabase.from('profiles').select('full_name').eq('role', 'rider')
      ]);

      const statuses = [...new Set(ordersRes.data?.map(o => o.status) || [])];
      const paymentMethods = [...new Set(ordersRes.data?.map(o => o.payment_method) || [])];
      const categories = [...new Set(productsRes.data?.map(p => p.category) || [])];
      const riders = ridersRes.data?.map(r => ({ id: r.id, name: r.full_name })) || [];

      return {
        success: true,
        options: {
          statuses,
          paymentMethods,
          categories,
          riders,
          deliveryStatuses: ['assigned', 'accepted', 'picked_up', 'delivered', 'failed', 'declined']
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
