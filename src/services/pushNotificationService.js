import { supabase } from '../lib/supabase';

export const pushNotificationService = {
  getPermissionState() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    return Notification.permission;
  },

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return { success: false, error: 'Browser does not support notifications' };
    }

    if (Notification.permission === 'granted') {
      return { success: true, permission: 'granted' };
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return { success: permission === 'granted', permission };
      } catch (error) {
        return { success: false, error: error.message, permission: this.getPermissionState() };
      }
    }

    return { success: false, error: 'Notification permission denied', permission: 'denied' };
  },

  /**
   * Send a local notification
   */
  sendNotification(title, options = {}) {
    if (Notification.permission !== 'granted') return false;

    try {
      new Notification(title, {
        icon: '/petron-logo.png',
        badge: '/petron-logo.png',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  },

  /**
   * Create notification in database and notify user
   */
  async createNotification(userId, notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || {}
        }])
        .select()
        .single();

      if (error) throw error;

      // Send browser notification if user is online
      this.sendNotification(notificationData.title, {
        body: notificationData.message,
        tag: notificationData.type,
        data: { notificationId: data.id, ...notificationData.data }
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(userId, onNewNotification, onStatusChange) {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNewNotification(payload.new);
          // Send browser notification
          this.sendNotification(payload.new.title, {
            body: payload.new.message,
            tag: payload.new.type,
            data: { notificationId: payload.new.id, ...payload.new.data }
          });
        }
      )
      .subscribe((status) => {
        if (typeof onStatusChange === 'function') {
          onStatusChange(status);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove one notification
   */
  async removeNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Clear all notifications for user
   */
  async clearNotifications(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return { success: false, error: error.message };
    }
  }
};
