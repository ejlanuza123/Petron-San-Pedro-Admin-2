// src/hooks/useOrders.js
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { useAdminLog } from './useAdminLog';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';

export function useOrders() {
  const { logOrderAction } = useAdminLog();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Throttle refetch to prevent excessive calls
  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getAll();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + route change refetch
  useEffect(() => {
    fetchOrders();
  }, [location.pathname, fetchOrders]);

  // Visibility change refetch (tab switch)
  useEffect(() => {
    const throttledRefetch = throttle(fetchOrders, 1000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledRefetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders]);

  // Real-time subscription (unchanged)
  useEffect(() => {
    const subscription = orderService.subscribeToChanges((payload) => {
      if (payload.eventType === 'INSERT') {
        setOrders(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setOrders(prev => prev.map(o => 
          o.id === payload.new.id ? { ...o, ...payload.new } : o
        ));
        setSelectedOrder(prev => (
          prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev
        ));
      } else if (payload.eventType === 'DELETE') {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        setSelectedOrder(prev => (
          prev?.id === payload.old.id ? null : prev
        ));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      setError(null);
      const existingOrder = orders.find((o) => o.id === orderId);
      const oldStatus = existingOrder?.status;

      await orderService.updateStatus(orderId, newStatus);
      // State will be updated by real-time subscription

      const changes = diffObjects({ status: oldStatus }, { status: newStatus });
      const description = formatChangesDescription(changes) || `Status updated to ${newStatus}`;

      await logOrderAction(orderId, 'update_status', changes, description);
      notifySuccess(description);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const order = await orderService.getById(orderId);
      setSelectedOrder(order);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    orders,
    loading,
    error,
    selectedOrder,
    setSelectedOrder,
    updateStatus,
    viewOrderDetails,
    refetch: fetchOrders
  };
}