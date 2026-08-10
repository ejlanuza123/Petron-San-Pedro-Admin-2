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
   * @returns {Promise<{ enabled: boolean, maxOrders: number, radiusKm: number, timeoutMins: number, strategy: string }>}
   */
  async getAutoDispatchSettings() {
    try {
      const enabledVal = await this.getSetting('auto_dispatch_enabled', 'true');
      const maxVal = await this.getSetting('auto_dispatch_max_rider_orders', '3');
      const radiusVal = await this.getSetting('auto_dispatch_radius_km', '10');
      const timeoutVal = await this.getSetting('auto_dispatch_timeout_mins', '5');
      const strategyVal = await this.getSetting('auto_dispatch_strategy', 'nearest');

      return {
        enabled: enabledVal === 'true' || enabledVal === true,
        maxOrders: Number.parseInt(String(maxVal), 10) || 3,
        radiusKm: Number.parseFloat(String(radiusVal)) || 10,
        timeoutMins: Number.parseInt(String(timeoutVal), 10) || 5,
        strategy: strategyVal || 'nearest',
      };
    } catch (error) {
      console.error('Error fetching auto dispatch settings:', error);
      return { enabled: true, maxOrders: 3, radiusKm: 10, timeoutMins: 5, strategy: 'nearest' };
    }
  },

  /**
   * Update Auto-Dispatch configuration settings
   * @param {{ enabled: boolean, maxOrders: number, radiusKm: number, timeoutMins: number, strategy: string }} settings
   * @returns {Promise<boolean>} Success status
   */
  async updateAutoDispatchSettings({ enabled, maxOrders, radiusKm, timeoutMins, strategy }) {
    try {
      const updates = [
        { key: 'auto_dispatch_enabled', value: String(!!enabled), updated_at: new Date().toISOString() },
        { key: 'auto_dispatch_max_rider_orders', value: String(maxOrders || 3), updated_at: new Date().toISOString() },
        { key: 'auto_dispatch_radius_km', value: String(radiusKm || 10), updated_at: new Date().toISOString() },
        { key: 'auto_dispatch_timeout_mins', value: String(timeoutMins || 5), updated_at: new Date().toISOString() },
        { key: 'auto_dispatch_strategy', value: String(strategy || 'nearest'), updated_at: new Date().toISOString() }
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
  },

  /**
   * Get Low Stock Threshold
   * @returns {Promise<number>} Low stock threshold count (default: 10)
   */
  async getLowStockThreshold() {
    try {
      const val = await this.getSetting('low_stock_threshold', '10');
      const parsed = parseInt(String(val), 10);
      return Number.isNaN(parsed) ? 10 : parsed;
    } catch (error) {
      console.error('Error fetching low stock threshold:', error);
      return 10;
    }
  },

  /**
   * Update Low Stock Threshold
   * @param {number} threshold - New threshold number
   * @returns {Promise<boolean>} Success status
   */
  async updateLowStockThreshold(threshold) {
    try {
      const val = Math.max(1, parseInt(String(threshold), 10) || 10);
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'low_stock_threshold',
          value: String(val),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating low stock threshold:', error);
      return false;
    }
  }
};
