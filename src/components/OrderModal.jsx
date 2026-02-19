// src/components/OrderModal.jsx
import { X, MapPin, Phone, User, CreditCard, Package, Calendar, Hash, Store } from 'lucide-react';
import { ORDER_STATUS_COLORS } from '../utils/constants';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/formatters';

export default function OrderModal({ isOpen, onClose, order, onStatusChange }) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Hash className="mr-2" size={20} />
              Order #{order.id}
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              <Calendar className="inline mr-1" size={14} />
              {formatDate(order.created_at)}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-blue-500 rounded-full transition text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Status Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Status</p>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold border ${ORDER_STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value)}
                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.keys(ORDER_STATUS_COLORS).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Customer and Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <User size={18} className="mr-2 text-blue-600" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{order.profiles?.full_name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Phone size={14} className="mr-1" /> Phone Number
                    </p>
                    <p className="font-medium text-gray-900">{formatPhoneNumber(order.profiles?.phone_number)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin size={18} className="mr-2 text-blue-600" />
                  Delivery Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium text-gray-900">{order.delivery_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <CreditCard size={14} className="mr-1" /> Payment Method
                    </p>
                    <p className="font-medium text-gray-900">{order.payment_method}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Package size={18} className="mr-2 text-blue-600" />
                Order Items
              </h3>
              
              {order.order_items && order.order_items.length > 0 ? (
                <div className="space-y-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Store size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.products?.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.products?.unit} × {formatCurrency(item.price_at_order)}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-blue-600">
                        {formatCurrency(item.quantity * item.price_at_order)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No items found</p>
              )}

              {/* Order Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700">Total Amount</span>
                  <span className="text-blue-600">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Print Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}