import React from 'react';
import { X, MapPin, Phone, User, CreditCard, Package } from 'lucide-react';

const STATUS_COLORS = {
  'Pending': 'bg-orange-100 text-orange-800',
  'Processing': 'bg-blue-100 text-blue-800',
  'Out for Delivery': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800',
};

export default function OrderModal({ isOpen, onClose, order, onStatusChange }) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order #{order.id}</h2>
            <p className="text-sm text-gray-500">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
            </div>
            <div>
              <select
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <User size={18} className="mr-2 text-blue-600" /> Customer Info
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Name:</span> {order.profiles?.full_name || 'Guest'}</p>
                <p className="flex items-center">
                  <Phone size={14} className="mr-2" /> {order.profiles?.phone_number || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin size={18} className="mr-2 text-blue-600" /> Delivery Details
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{order.delivery_address}</p>
                <p className="flex items-center mt-2">
                  <CreditCard size={14} className="mr-2" /> {order.payment_method}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items (This would require fetching from order_items table in a real scenario) */}
          {/* For now, we show the total summary */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Package size={18} className="mr-2 text-blue-600" /> Order Summary
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Total Amount</span>
                <span>₱{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}