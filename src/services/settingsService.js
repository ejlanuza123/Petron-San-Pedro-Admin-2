// src/services/settingsService.js
import { supabase } from '../lib/supabase';

export const settingsService = {
  /**
   * Get the default delivery fee from app_settings
   * @returns {Promise<number>} Default delivery fee in Philippine Pesos
   */
  async getDefaultDeliveryFee() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'default_delivery_fee')
        .single();

      if (error) {
        console.warn('Could not fetch default delivery fee, using fallback:', error);
        return 50; // Fallback to ₱50
      }

      return parseFloat(data?.value) || 50;
    } catch (error) {
      console.error('Error fetching default delivery fee:', error);
      return 50; // Fallback to ₱50
    }
  },

  /**
   * Update the default delivery fee
   * @param {number} fee - New delivery fee amount
   * @returns {Promise<boolean>} Success status
   */
  async updateDefaultDeliveryFee(fee) {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'default_delivery_fee',
          value: fee.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating default delivery fee:', error);
      return false;
    }
  },

  /**
   * Get Auto-Dispatch configuration settings
   * @returns {Promise<{ enabled: boolean, maxOrders: number }>}
   */
  async getAutoDispatchSettings() {
    try {
      const enabledVal = await this.getSetting('auto_dispatch_enabled', 'true');
      const maxVal = await this.getSetting('auto_dispatch_max_rider_orders', '3');
      return {
        enabled: enabledVal === 'true' || enabledVal === true,
        maxOrders: Number.parseInt(String(maxVal), 10) || 3
      };
    } catch (error) {
      console.error('Error fetching auto dispatch settings:', error);
      return { enabled: true, maxOrders: 3 };
    }
  },

  /**
   * Update Auto-Dispatch configuration settings
   * @param {{ enabled: boolean, maxOrders: number }} settings
   * @returns {Promise<boolean>} Success status
   */
  async updateAutoDispatchSettings({ enabled, maxOrders }) {
    try {
      const updates = [
        { key: 'auto_dispatch_enabled', value: String(!!enabled), updated_at: new Date().toISOString() },
        { key: 'auto_dispatch_max_rider_orders', value: String(maxOrders || 3), updated_at: new Date().toISOString() }
      ];
      const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating auto dispatch settings:', error);
      return false;
    }
  },

  /**
   * Get any app setting by key
   * @param {string} key - Setting key
   * @param {any} defaultValue - Fallback value if not found
   * @returns {Promise<any>} Setting value
   */
  async getSetting(key, defaultValue = null) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        return defaultValue;
      }

      return data?.value || defaultValue;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return defaultValue;
    }
  }
};
