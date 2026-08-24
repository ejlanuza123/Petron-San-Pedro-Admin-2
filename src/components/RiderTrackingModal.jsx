// src/components/RiderTrackingModal.jsx
import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, Truck, Clock, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, formatPhoneNumber, formatOrderNumber } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function RiderTrackingModal({ isOpen, onClose, order, delivery }) {
  const { isDarkMode } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && delivery) {
      fetchDeliveryTimeline();
      subscribeToLocationUpdates();
    }
  }, [isOpen, delivery]);

  const fetchDeliveryTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('order_id', order.id)
        .order('assigned_at', { ascending: true });

      if (error) throw error;
      setTimeline(data || []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  const subscribeToLocationUpdates = () => {
    const channel = supabase
      .channel(`delivery-${delivery.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${delivery.id}`
        },
        () => {
          fetchDeliveryTimeline();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'assigned':
        return <Clock className="text-yellow-500" size={20} />;
      case 'accepted':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'picked_up':
        return <Truck className="text-blue-500" size={20} />;
      case 'delivered':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'declined':
      case 'failed':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <MapPin className="text-gray-500" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'assigned':
        return 'Assigned to rider';
      case 'accepted':
        return 'Accepted - Ready to Pick Up';
      case 'picked_up':
        return 'Picked up by rider';
      case 'delivered':
        return 'Delivered to customer';
      case 'declined':
        return 'Delivery declined';
      case 'failed':
        return 'Delivery failed';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className={`rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'
      }`}>
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Navigation className="mr-2" size={24} />
            Track Delivery - Order {formatOrderNumber(order?.order_number, order?.id)}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-5">
          {/* Rider Info */}
          {delivery?.rider && (
            <div className={`p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode ? 'bg-blue-950/30 border-blue-900/40' : 'bg-blue-50 border-blue-100'
            }`}>
              <h4 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-blue-200' : 'text-gray-900'}`}>
                <User size={18} className="mr-2 text-[#0033A0] dark:text-blue-400" />
                Rider Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Name</p>
                  <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{delivery.rider.full_name}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Contact</p>
                  <p className={`font-medium flex items-center ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                    <Phone size={14} className="mr-1" />
                    {formatPhoneNumber(delivery.rider.phone_number)}
                  </p>
                </div>
                {delivery.rider.vehicle_type && (
                  <div className="col-span-2">
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Vehicle</p>
                    <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>
                      {delivery.rider.vehicle_type} {delivery.rider.vehicle_plate && `(${delivery.rider.vehicle_plate})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className={`p-4 rounded-lg border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Current Status</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(delivery?.status)}
                <span className={`ml-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                  {getStatusText(delivery?.status)}
                </span>
              </div>
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {delivery?.delivered_at 
                  ? formatDate(delivery.delivered_at)
                  : delivery?.assigned_at 
                    ? formatDate(delivery.assigned_at)
                    : ''}
              </span>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div className={`p-4 rounded-lg border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Delivery Timeline</h4>
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      {getStatusIcon(item.status)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className={`absolute top-8 left-4 w-0.5 h-12 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{getStatusText(item.status)}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {item.assigned_at && formatDate(item.assigned_at)}
                      {item.delivered_at && formatDate(item.delivered_at)}
                    </p>
                    {item.notes && (
                      <p className={`text-sm mt-1 p-2 rounded ${isDarkMode ? 'bg-slate-700/80 text-slate-300' : 'bg-gray-50 text-gray-600'}`}>
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className={`p-4 rounded-lg border transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <h4 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
              <MapPin size={18} className="mr-2 text-[#0033A0] dark:text-blue-400" />
              Delivery Address
            </h4>
            <p className={`text-sm mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{order?.delivery_address}</p>
            {order?.delivery_lat && order?.delivery_lng && (
              <a
                href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-[#0033A0] dark:text-blue-400 hover:underline transition-colors"
              >
                <Navigation size={14} className="mr-1" />
                View on Google Maps
              </a>
            )}
          </div>
        </div>

        <div className={`p-6 border-t transition-colors duration-300 ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg border font-medium transition-colors duration-300 ${
              isDarkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
