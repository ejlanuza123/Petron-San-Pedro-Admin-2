// src/components/OrderAlertBanner.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, X, ExternalLink, ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playNotificationChime } from '../services/pushNotificationService';
import { formatCurrency, formatOrderNumber } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function OrderAlertBanner({ storeName = "Petron Station" }) {
  const navigate = useNavigate();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('admin_order_sound_muted') === 'true';
  });

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('admin_order_sound_muted', String(next));
      return next;
    });
  };

  const handleDismiss = useCallback((orderId) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== orderId));
  }, []);

  const handleViewOrder = useCallback((order) => {
    handleDismiss(order.id);
    navigate('/orders', { state: { focusOrderId: order.id, focusNonce: Date.now() } });
  }, [navigate, handleDismiss]);

  // Subscribe to real-time incoming orders
  useEffect(() => {
    const channel = supabase
      .channel('realtime-new-orders-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new;
          if (!newOrder) return;

          console.log('🔔 Real-Time Order Received on Admin Dashboard:', newOrder);

          // Play Audio Chime
          if (!isMuted) {
            playNotificationChime();
          }

          // Add alert banner
          setActiveAlerts(prev => [newOrder, ...prev.slice(0, 3)]); // Keep up to 4 stacked
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMuted]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {activeAlerts.map((order) => (
        <div
          key={order.id}
          className="pointer-events-auto bg-white dark:bg-slate-900 border-2 border-[#0033A0] dark:border-blue-500 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-slideInRight transform transition-all duration-300 hover:scale-[1.02]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 bg-blue-100 dark:bg-blue-900/40 text-[#0033A0] dark:text-blue-400 rounded-xl animate-pulse">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-wide">
                  NEW ORDER RECEIVED 🔔
                </h4>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {storeName} Dispatch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                title={isMuted ? "Unmute Order Bell Chime" : "Mute Order Bell Chime"}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
              </button>
              <button
                onClick={() => handleDismiss(order.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details Body */}
          <div className="flex justify-between items-center bg-blue-50/60 dark:bg-slate-800/60 p-3 rounded-xl border border-blue-100/80 dark:border-slate-700">
            <div>
              <span className="text-xs font-bold text-gray-900 dark:text-white block">
                {formatOrderNumber(order.order_number) || `Order #${order.id}`}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block truncate max-w-[200px]">
                {order.customer_name || order.delivery_address || 'Customer Delivery'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-green-600 block">
                {formatCurrency(order.total_amount || 0)}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-block">
                {order.status || 'Pending'}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleDismiss(order.id)}
              className="flex-1 py-2 px-3 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleViewOrder(order)}
              className="flex-1 py-2 px-3 bg-[#0033A0] hover:bg-[#002270] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <span>View Order</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
