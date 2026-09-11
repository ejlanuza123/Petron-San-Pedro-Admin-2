// src/services/broadcastNotificationService.js
import { supabase } from '../lib/supabase';

export const BROADCAST_CATEGORIES = [
  {
    id: 'weather_advisory',
    name: 'Weather & Operations',
    icon: 'CloudRain',
    color: '#EAB308', // Amber/Yellow
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
  },
  {
    id: 'promo',
    name: 'Flash Promo & Discounts',
    icon: 'Flame',
    color: '#EC4899', // Pink/Rose
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-700'
  },
  {
    id: 'announcement',
    name: 'General Announcement',
    icon: 'Megaphone',
    color: '#3B82F6', // Blue
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700'
  },
  {
    id: 'emergency',
    name: 'Emergency & Advisories',
    icon: 'AlertTriangle',
    color: '#EF4444', // Red
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700'
  }
];

export const PRESET_TEMPLATES = [
  {
    id: 'rain_advisory',
    category: 'weather_advisory',
    targetAudience: 'all',
    title: '🌧️ Heavy Rain Advisory',
    message: 'Deliveries in San Pedro may be delayed by 10–15 mins for rider safety. Thank you for your patience!'
  },
  {
    id: 'friday_promo',
    category: 'promo',
    targetAudience: 'customers',
    title: '🍗 Friday Special Promo!',
    message: 'Enjoy 15% off all Platters and Bundles from 5:00 PM to 8:00 PM today! Order now via the mobile app.'
  },
  {
    id: 'gasul_refill',
    category: 'promo',
    targetAudience: 'customers',
    title: '⛽ Petron Gasul Refill Alert',
    message: 'Running low on cooking fuel? Order your authentic Petron Gasul refill today for prompt doorstep delivery.'
  },
  {
    id: 'rider_high_demand',
    category: 'announcement',
    targetAudience: 'riders',
    title: '🛵 High Demand Alert for Riders',
    message: 'Order volume is peaking right now in Poblacion and Cuyab! Go online to claim high-priority delivery incentives.'
  },
  {
    id: 'holiday_schedule',
    category: 'emergency',
    targetAudience: 'all',
    title: '⚠️ Holiday Operating Hours',
    message: 'Our station will observe adjusted holiday hours today and close at 6:00 PM. Please schedule orders early!'
  }
];

export const broadcastNotificationService = {
  /**
   * Fetch estimated recipient counts by role
   */
  async getAudienceEstimates() {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('role, notifications_enabled, fcm_token')
        .eq('is_active', true);

      if (error) throw error;

      let customersCount = 0;
      let ridersCount = 0;
      let customerTokens = 0;
      let riderTokens = 0;

      (profiles || []).forEach((p) => {
        const isNotifEnabled = p.notifications_enabled !== false;
        const hasToken = !!(p.fcm_token && String(p.fcm_token).trim());

        if (p.role === 'customer' && isNotifEnabled) {
          customersCount += 1;
          if (hasToken) customerTokens += 1;
        } else if (p.role === 'rider' && isNotifEnabled) {
          ridersCount += 1;
          if (hasToken) riderTokens += 1;
        }
      });

      return {
        success: true,
        customers: customersCount,
        riders: ridersCount,
        total: customersCount + ridersCount,
        pushTokens: {
          customers: customerTokens,
          riders: riderTokens,
          total: customerTokens + riderTokens
        }
      };
    } catch (err) {
      console.error('Error fetching audience estimates:', err);
      return {
        success: false,
        customers: 0,
        riders: 0,
        total: 0,
        pushTokens: { customers: 0, riders: 0, total: 0 },
        error: err?.message || 'Failed to estimate audience'
      };
    }
  },

  /**
   * Send push tokens in batches of 100 to Expo Push API
   */
  async sendExpoPushChunks(tokens, { title, message, category, data = {} }) {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    // Filter valid Expo push tokens
    const validTokens = tokens.filter(
      (t) => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
    );

    if (validTokens.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    const CHUNK_SIZE = 100;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validTokens.length; i += CHUNK_SIZE) {
      const chunk = validTokens.slice(i, i + CHUNK_SIZE);
      const messages = chunk.map((to) => ({
        to,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        title,
        body: message,
        data: {
          type: 'broadcast',
          category,
          ...data
        }
      }));

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
          },
          body: JSON.stringify(messages)
        });

        if (response.ok) {
          sentCount += chunk.length;
        } else {
          failedCount += chunk.length;
        }
      } catch (err) {
        console.warn('Expo push dispatch failed for batch:', err?.message || err);
        failedCount += chunk.length;
      }
    }

    return { sentCount, failedCount };
  },

  /**
   * Send broadcast notification: calls database RPC and triggers Expo push dispatch
   */
  async sendBroadcast({ targetAudience, category, title, message, data = {} }) {
    try {
      if (!['all', 'customers', 'riders'].includes(targetAudience)) {
        throw new Error('Please select a valid target audience (Everyone, Customers, or Riders).');
      }

      if (!title || !title.trim()) {
        throw new Error('Broadcast title is required.');
      }

      if (!message || !message.trim()) {
        throw new Error('Broadcast message is required.');
      }

      const { data: result, error } = await supabase.rpc('send_broadcast_notification', {
        p_target_audience: targetAudience,
        p_title: title.trim(),
        p_message: message.trim(),
        p_category: category || 'announcement',
        p_data: data
      });

      if (error) throw error;

      // Dispatch native push notifications via Expo Push API if tokens returned
      const tokens = result?.tokens || [];
      let pushStats = { sentCount: 0, failedCount: 0 };

      if (tokens.length > 0) {
        pushStats = await this.sendExpoPushChunks(tokens, {
          title: title.trim(),
          message: message.trim(),
          category,
          data
        });
      }

      return {
        success: true,
        broadcastId: result?.broadcast_id,
        recipientCount: result?.recipient_count || 0,
        tokensCount: result?.tokens_count || 0,
        pushSentCount: pushStats.sentCount
      };
    } catch (err) {
      console.error('Failed to send broadcast notification:', err);
      return {
        success: false,
        error: err?.message || 'Failed to dispatch broadcast notification.'
      };
    }
  },

  /**
   * Get past broadcast history with pagination
   */
  async getBroadcastHistory({ page = 1, limit = 15 } = {}) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await supabase
        .from('broadcast_notifications')
        .select(`
          id,
          target_audience,
          category,
          title,
          message,
          recipient_count,
          push_tokens_count,
          created_at,
          profiles:sender_id (
            id,
            full_name,
            email,
            role
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (err) {
      console.error('Error fetching broadcast history:', err);
      return {
        success: false,
        data: [],
        count: 0,
        page,
        totalPages: 0,
        error: err?.message || 'Failed to load broadcast history'
      };
    }
  }
};

export default broadcastNotificationService;
