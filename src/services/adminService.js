// src/services/adminService.js
import { supabase } from '../lib/supabase';

export const adminService = {
  /**
   * Fetches all admin profiles and auth sign-in status
   */
  async getAdminAccounts() {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_accounts_list');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData;
      }
      if (rpcError) {
        console.warn('RPC get_admin_accounts_list warning:', rpcError.message);
      }
    } catch (e) {
      console.warn('RPC call exception, using direct fallback:', e);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .in('role', ['admin', 'superadmin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch profiles table:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Creates a new admin or superadmin account
   */
  async createAdminAccount({ email, password, full_name, role = 'admin' }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        }
      }
    });

    if (authError) throw authError;

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name,
          role,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;
    }

    return authData.user;
  },

  /**
   * Updates an admin account role ('admin' <-> 'superadmin')
   */
  async updateAdminRole(adminId, newRole) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggles an admin account active/suspended status
   */
  async toggleAdminStatus(adminId, isActive) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches recent security audit logs
   */
  async getAdminAuditLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles:user_id(full_name, email, role)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Audit logs table query warning:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  }
};
