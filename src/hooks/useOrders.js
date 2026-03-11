// src/hooks/useOrders.js
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';
import { useAdminLog } from './useAdminLog';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';

export function useOrders() {
  const { logOrderAction } = useAdminLog();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription
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
  }, [fetchOrders]);

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