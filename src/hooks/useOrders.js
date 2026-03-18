// src/hooks/useOrders.js
import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Track whether we have fetched at least once so that navigating back to
  // this route doesn't flash skeletons over already-loaded data.
  const hasFetchedRef = useRef(false);

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      // Only show skeletons on the very first load, never on silent refreshes
      // or subsequent navigations where we already have data.
      if (!isSilent && !hasFetchedRef.current) {
        setLoading(true);
      }
      setError(null);
      const data = await orderService.getAll();
      setOrders(data);
      hasFetchedRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only — do NOT re-run on pathname change to avoid
  // skeleton-lock when returning from another tab or page.
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

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
    refetch: fetchOrders,
  };
}