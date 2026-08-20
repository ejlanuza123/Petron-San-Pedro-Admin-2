import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useError } from './ErrorContext';
import { supabase } from '../lib/supabase';
import { pushNotificationService, playNotificationChime } from '../services/pushNotificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { setError } = useError();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const unsubscribeRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  const showNotificationError = (errorId, title, message, details) => {
    setError(errorId, {
      title,
      message,
      details,
      type: 'error'
    });
  };

  const requestNotificationPermission = async () => {
    const result = await pushNotificationService.requestPermission();
    setPermissionGranted(Boolean(result.success));
    setPermissionStatus(result.permission || pushNotificationService.getPermissionState());
    return result;
  };

  // Request notification permission on mount and keep state in sync.
  useEffect(() => {
    setPermissionStatus(pushNotificationService.getPermissionState());

    const requestPermission = async () => {
      await requestNotificationPermission();
    };
    requestPermission();
  }, []);

  // Load initial notifications
  useEffect(() => {
    if (!user?.id) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.is_read).length);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        showNotificationError(
          'notifications-load',
          'Notifications Unavailable',
          'Failed to load notifications. Please try refreshing the page.',
          error.message
        );
      } finally {
        setLoading(false);
      }
    };

    let disposed = false;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const cleanupSubscription = () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };

    const subscribe = () => {
      if (disposed) return;

      cleanupSubscription();

      unsubscribeRef.current = pushNotificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        },
        (status) => {
          if (disposed) return;

          if (status === 'SUBSCRIBED') {
            reconnectAttemptsRef.current = 0;
            clearReconnectTimeout();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearReconnectTimeout();

            const backoffMs = Math.min(30000, 1000 * (2 ** reconnectAttemptsRef.current));
            reconnectAttemptsRef.current += 1;

            reconnectTimeoutRef.current = setTimeout(() => {
              subscribe();
            }, backoffMs);
          }
        }
      );
    };

    loadNotifications();
    subscribe();

    return () => {
      disposed = true;
      clearReconnectTimeout();
      cleanupSubscription();
    };
  }, [user?.id]);

  const markAsRead = async (notificationId) => {
    // Optimistically mark as read in local state immediately
    setNotifications(prev => {
      let didTransitionToRead = false;

      const next = prev.map(n => {
        if (n.id === notificationId && !n.is_read) {
          didTransitionToRead = true;
          return { ...n, is_read: true };
        }
        return n;
      });

      if (didTransitionToRead) {
        setUnreadCount(count => Math.max(0, count - 1));
      }

      return next;
    });

    try {
      const result = await pushNotificationService.markAsRead(notificationId);
      if (!result?.success && !result?.localOnly) {
        console.warn('Failed to persist mark notification as read:', result?.error);
      }
    } catch (error) {
      console.warn('Failed to persist mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const result = await pushNotificationService.markAllAsRead(user?.id);
      if (!result?.success) {
        console.warn('Failed to mark all notifications as read in backend:', result?.error);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      showNotificationError(
        'notifications-mark-all-read',
        'Update Failed',
        'Failed to mark all notifications as read. Please try again.',
        error.message
      );
    }
  };

  const removeNotification = async (notificationId) => {
    // Optimistically remove from local state immediately
    setNotifications(prev => {
      let removedWasUnread = false;
      const next = prev.filter(n => {
        if (n.id === notificationId) {
          removedWasUnread = !n.is_read;
          return false;
        }
        return true;
      });

      if (removedWasUnread) {
        setUnreadCount(count => Math.max(0, count - 1));
      }

      return next;
    });

    try {
      const result = await pushNotificationService.removeNotification(notificationId);
      if (!result?.success && !result?.localOnly) {
        console.warn('Failed to persist remove notification in backend:', result?.error);
      }
    } catch (error) {
      console.warn('Failed to persist remove notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      const result = await pushNotificationService.clearNotifications(user.id);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to clear notifications');
      }

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      showNotificationError(
        'notifications-clear-all',
        'Clear Failed',
        'Failed to clear notifications. Please try again.',
        error.message
      );
    }
  };

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_order_sound_enabled');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const toggleSoundEnabled = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admin_order_sound_enabled', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to store sound preference:', err);
      }
      return next;
    });
  };

  // Subscribe to real-time incoming orders to play audio chime and browser notification
  useEffect(() => {
    const unsubscribeOrderAlerts = pushNotificationService.subscribeToOrderAlerts(async (newOrder) => {
      if (!newOrder?.id) return;

      if (soundEnabled) {
        playNotificationChime();
      }

      const orderTitle = `🔔 New Order #${String(newOrder.id || '').slice(0, 8)}`;
      const orderMessage = `Amount: ₱${Number(newOrder.total_amount || 0).toLocaleString()} • Status: ${newOrder.status || 'Pending'}`;

      pushNotificationService.sendNotification(orderTitle, {
        body: orderMessage,
        tag: 'order_created',
        clickUrl: '/orders'
      });

      let dbNotification = null;
      if (user?.id) {
        try {
          const res = await pushNotificationService.createNotification(user.id, {
            type: 'order_created',
            title: orderTitle,
            message: orderMessage,
            data: { order_id: newOrder.id }
          });
          if (res?.success && res?.data) {
            dbNotification = res.data;
          }
        } catch (err) {
          console.warn('Could not persist order notification to database:', err);
        }
      }

      const inAppItem = dbNotification || {
        id: `order-alert-${newOrder.id}-${Date.now()}`,
        type: 'order_created',
        title: orderTitle,
        message: orderMessage,
        created_at: new Date().toISOString(),
        is_read: false,
        data: { order_id: newOrder.id }
      };

      setNotifications(prev => {
        const isDuplicate = prev.some(n => 
          n.id === inAppItem.id || 
          (n.data?.order_id && String(n.data.order_id) === String(newOrder.id) && (Date.now() - new Date(n.created_at).getTime() < 30000))
        );
        if (isDuplicate) return prev;
        return [inAppItem, ...prev];
      });
      setUnreadCount(count => count + 1);
    });

    return () => {
      unsubscribeOrderAlerts();
    };
  }, [soundEnabled, user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        permissionGranted,
        permissionStatus,
        soundEnabled,
        toggleSoundEnabled,
        requestNotificationPermission,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
