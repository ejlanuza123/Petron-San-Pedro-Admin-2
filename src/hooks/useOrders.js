// src/hooks/useOrders.js
import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orderService';

export function useOrders() {
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
        if (selectedOrder?.id === payload.new.id) {
          setSelectedOrder(prev => ({ ...prev, ...payload.new }));
        }
      } else if (payload.eventType === 'DELETE') {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        if (selectedOrder?.id === payload.old.id) {
          setSelectedOrder(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrders, selectedOrder]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      setError(null);
      await orderService.updateStatus(orderId, newStatus);
      // State will be updated by real-time subscription
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