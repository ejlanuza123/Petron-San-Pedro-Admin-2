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

  // ADDED: isSilent parameter defaults to false
  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true); // ONLY set loading if not silent
      setError(null);
      const data = await orderService.getAll();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Always clear the loading state when done
    }
  }, []);

  // Initial load + route change refetch (not silent, shows skeletons)
  useEffect(() => {
    fetchOrders(false);
  }, [location.pathname, fetchOrders]);

  // Real-time subscription
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
    refetch: fetchOrders // This now accepts true/false!
  };
}