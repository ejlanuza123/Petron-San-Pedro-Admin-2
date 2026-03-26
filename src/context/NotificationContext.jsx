import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useError } from './ErrorContext';
import { supabase } from '../lib/supabase';
import { pushNotificationService } from '../services/pushNotificationService';

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
    try {
      const result = await pushNotificationService.markAsRead(notificationId);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to mark notification as read');
      }

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
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      showNotificationError(
        `notifications-mark-read-${notificationId}`,
        'Update Failed',
        'Failed to mark notification as read. Please try again.',
        error.message
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await pushNotificationService.markAllAsRead(user.id);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to mark all notifications as read');
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
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
    try {
      const result = await pushNotificationService.removeNotification(notificationId);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to remove notification');
      }

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
    } catch (error) {
      console.error('Failed to remove notification:', error);
      showNotificationError(
        `notifications-remove-${notificationId}`,
        'Remove Failed',
        'Failed to remove notification. Please try again.',
        error.message
      );
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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        permissionGranted,
        permissionStatus,
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
