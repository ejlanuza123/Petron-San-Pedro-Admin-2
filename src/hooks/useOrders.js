// src/hooks/useOrders.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { orderService } from '../services/orderService';
import { useAdminLog } from './useAdminLog';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';
import { retryAsync } from '../utils/retry';

export function useOrders() {
  const { logOrderAction } = useAdminLog();
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
      const data = await retryAsync(() => orderService.getAll(), {
        maxRetries: 2,
        initialDelayMs: 350
      });
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
    const subscription = orderService.subscribeToChanges(async (payload) => {
      if (payload.eventType === 'INSERT') {
        try {
          // Fetch complete joined order so customer profile and line items appear immediately
          const fullOrder = await orderService.getById(payload.new.id);
          setOrders(prev => {
            if (prev.some(o => o.id === fullOrder.id)) return prev;
            return [fullOrder, ...prev];
          });
        } catch (err) {
          console.warn('Failed to fetch full order on real-time insert, falling back to raw payload:', err);
          setOrders(prev => {
            if (prev.some(o => o.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        try {
          const fullOrder = await orderService.getById(payload.new.id);
          setOrders(prev => prev.map(o => o.id === fullOrder.id ? fullOrder : o));
          setSelectedOrder(prev => (
            prev?.id === fullOrder.id ? fullOrder : prev
          ));
        } catch (err) {
          setOrders(prev => prev.map(o =>
            o.id === payload.new.id ? { ...o, ...payload.new } : o
          ));
          setSelectedOrder(prev => (
            prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev
          ));
        }
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

  const updateStatus = async (orderId, newStatus, options = {}) => {
    const previousOrders = [...orders];
    const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;

    const existingOrder = orders.find((o) => o.id === orderId);
    const oldStatus = existingOrder?.status;

    // 1. Optimistic local state update
    const optimisticPatch = {
      status: newStatus,
      cancellation_reason: options?.cancellationReason || existingOrder?.cancellation_reason,
      cancelled_by: options?.cancelledBy || existingOrder?.cancelled_by,
      cancelled_at: newStatus === 'Cancelled' ? new Date().toISOString() : existingOrder?.cancelled_at,
      updated_at: new Date().toISOString()
    };

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...optimisticPatch } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, ...optimisticPatch } : null);
    }

    try {
      setError(null);

      await retryAsync(() => orderService.updateStatus(orderId, newStatus, options), {
        maxRetries: 1,
        initialDelayMs: 300
      });

      const changes = diffObjects(
        {
          status: oldStatus,
          cancellation_reason: existingOrder?.cancellation_reason,
          cancelled_by: existingOrder?.cancelled_by,
          cancelled_at: existingOrder?.cancelled_at
        },
        {
          status: newStatus,
          cancellation_reason: options?.cancellationReason || existingOrder?.cancellation_reason,
          cancelled_by: options?.cancelledBy || existingOrder?.cancelled_by,
          cancelled_at: newStatus === 'Cancelled' ? new Date().toISOString() : existingOrder?.cancelled_at
        }
      );
      const orderLabel = existingOrder?.order_number ? `Order ${existingOrder.order_number}` : 'Order';
      let description = formatChangesDescription(changes) || `${orderLabel} status updated to ${newStatus}`;

      if (newStatus === 'Cancelled') {
        const cancelledByLabel = options?.cancelledByName || 'Admin';
        const reasonText = options?.cancellationReason || existingOrder?.cancellation_reason || 'Unspecified';
        description = `${orderLabel} cancelled: status ${oldStatus || 'Unknown'} → Cancelled, cancellation reason ${reasonText}, cancelled by ${cancelledByLabel}`;
      }

      await logOrderAction(orderId, 'update_status', changes, description);
      notifySuccess(description);
    } catch (err) {
      // Rollback optimistic update on failure
      setOrders(previousOrders);
      setSelectedOrder(previousSelectedOrder);
      setError(err.message);
      throw err;
    }
  };

  const updateDeliveryFee = async (orderId, newFee) => {
    const previousOrders = [...orders];
    const previousSelectedOrder = selectedOrder ? { ...selectedOrder } : null;

    const existingOrder = orders.find((o) => o.id === orderId);
    const oldFee = existingOrder?.delivery_fee;

    // 1. Optimistic local state update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_fee: newFee } : o));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, delivery_fee: newFee } : null);
    }

    try {
      setError(null);

      await retryAsync(() => orderService.updateDeliveryFee(orderId, newFee), {
        maxRetries: 1,
        initialDelayMs: 300
      });

      const changes = diffObjects({ delivery_fee: oldFee }, { delivery_fee: newFee });
      const description = formatChangesDescription(changes) || `Delivery fee updated to ${newFee}`;

      await logOrderAction(orderId, 'update_delivery_fee', changes, description);
      notifySuccess(description);
    } catch (err) {
      // Rollback optimistic update on failure
      setOrders(previousOrders);
      setSelectedOrder(previousSelectedOrder);
      setError(err.message);
      throw err;
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const order = await retryAsync(() => orderService.getById(orderId), {
        maxRetries: 1,
        initialDelayMs: 300
      });
      setSelectedOrder(order);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    orders,
    loading,
    error,
    clearError: () => setError(null),
    selectedOrder,
    setSelectedOrder,
    updateStatus,
    updateDeliveryFee,
    viewOrderDetails,
    refetch: fetchOrders,
  };
}