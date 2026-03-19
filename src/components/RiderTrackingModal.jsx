// src/components/RiderTrackingModal.jsx
import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, Truck, Clock, CheckCircle, AlertCircle, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, formatPhoneNumber } from '../utils/formatters';

export default function RiderTrackingModal({ isOpen, onClose, order, delivery }) {
  const [currentLocation, setCurrentLocation] = useState(null);
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
    // In a real app, you'd have a location tracking table
    // For now, we'll just simulate
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
        (payload) => {
          // Update delivery info
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
        return 'Accepted by rider';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Navigation className="mr-2" size={24} />
            Track Delivery - Order #{order?.id}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Rider Info */}
          {delivery?.rider && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User size={18} className="mr-2 text-[#0033A0]" />
                Rider Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{delivery.rider.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <Phone size={14} className="mr-1" />
                    {formatPhoneNumber(delivery.rider.phone_number)}
                  </p>
                </div>
                {delivery.rider.vehicle_type && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-medium text-gray-900">
                      {delivery.rider.vehicle_type} {delivery.rider.vehicle_plate && `(${delivery.rider.vehicle_plate})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Status */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Current Status</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(delivery?.status)}
                <span className="ml-2 font-medium">
                  {getStatusText(delivery?.status)}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {delivery?.delivered_at 
                  ? formatDate(delivery.delivered_at)
                  : delivery?.assigned_at 
                    ? formatDate(delivery.assigned_at)
                    : ''}
              </span>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Delivery Timeline</h4>
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {getStatusIcon(item.status)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="absolute top-8 left-4 w-0.5 h-12 bg-gray-200"></div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">{getStatusText(item.status)}</p>
                    <p className="text-sm text-gray-500">
                      {item.assigned_at && formatDate(item.assigned_at)}
                      {item.delivered_at && formatDate(item.delivered_at)}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <MapPin size={18} className="mr-2 text-[#0033A0]" />
              Delivery Address
            </h4>
            <p className="text-gray-700 mb-2">{order?.delivery_address}</p>
            {order?.delivery_lat && order?.delivery_lng && (
              <a
                href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-[#0033A0] hover:text-[#ED1C24] transition-colors"
              >
                <Navigation size={14} className="mr-1" />
                View on Maps
              </a>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}