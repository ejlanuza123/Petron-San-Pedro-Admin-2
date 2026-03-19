// src/components/OrderModal.jsx
import React, { useEffect, useState } from 'react';
import { X, MapPin, Phone, User, CreditCard, Package, Calendar, Hash, Store, Edit3, Check, Image as ImageIcon, Truck } from 'lucide-react';
import { ORDER_STATUS_COLORS } from '../utils/constants';
import { formatCurrency, formatDate, formatPhoneNumber } from '../utils/formatters';
import { supabase } from '../lib/supabase';

export default function OrderModal({ isOpen, onClose, order, onStatusChange, onDeliveryFeeChange }) {
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState('');
  const [deliveryProofs, setDeliveryProofs] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const [loadingRider, setLoadingRider] = useState(false);

  useEffect(() => {
    if (order) {
      setFeeInput(order.delivery_fee != null ? String(order.delivery_fee) : '');
      setIsEditingFee(false);
      fetchDeliveryProofs();
      fetchRiderInfo();
    }
  }, [order]);

  const fetchRiderInfo = async () => {
    if (!order?.id) return;
    
    try {
      setLoadingRider(true);
      // Get delivery associated with this order
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          rider:profiles!deliveries_rider_id_fkey (
            id,
            full_name,
            phone_number,
            avatar_url,
            vehicle_type,
            vehicle_plate
          )
        `)
        .eq('order_id', order.id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deliveryError && deliveryError.code !== 'PGRST116') throw deliveryError;
      
      if (delivery && delivery.rider) {
        setRiderInfo(delivery.rider);
      } else {
        setRiderInfo(null);
      }
    } catch (error) {
      console.error('Error fetching rider info:', error);
      setRiderInfo(null);
    } finally {
      setLoadingRider(false);
    }
  };

  const fetchDeliveryProofs = async () => {
    if (!order?.id) return;
    
    try {
      setLoadingProofs(true);
      // Get delivery associated with this order
      const { data: deliveries, error: deliveryError } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', order.id);

      if (deliveryError) throw deliveryError;

      // If there are deliveries, fetch proofs for them
      if (deliveries && deliveries.length > 0) {
        const deliveryIds = deliveries.map(d => d.id);
        const { data: proofs, error: proofsError } = await supabase
          .from('delivery_proofs')
          .select('*')
          .in('delivery_id', deliveryIds)
          .order('delivered_at', { ascending: false });

        if (proofsError) throw proofsError;
        setDeliveryProofs(proofs || []);
      } else {
        setDeliveryProofs([]);
      }
    } catch (error) {
      console.error('Error fetching delivery proofs:', error);
      setDeliveryProofs([]);
    } finally {
      setLoadingProofs(false);
    }
  };

  if (!isOpen || !order) return null;

  const saveDeliveryFee = async () => {
    const parsed = parseFloat(feeInput);
    if (Number.isNaN(parsed)) return;
    await onDeliveryFeeChange?.(order.id, parsed);
    setIsEditingFee(false);
  };

  const cancelDeliveryFeeEdit = () => {
    setFeeInput(order.delivery_fee != null ? String(order.delivery_fee) : '');
    setIsEditingFee(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-blue-600">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              {/* Rider Information */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Truck size={18} className="mr-2 text-blue-600" />
                  Rider Information
                </h3>
                {loadingRider ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                ) : riderInfo ? (
                  <div className="space-y-3">
                    {/* Rider Avatar */}
                    <div className="flex justify-center mb-4">
                      {riderInfo.avatar_url ? (
                        <img
                          src={riderInfo.avatar_url}
                          alt={riderInfo.full_name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-blue-500"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                          <User size={40} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">{riderInfo.full_name}</p>
                    </div>
                    {riderInfo.phone_number && (
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Phone size={14} className="mr-1" /> Phone
                        </p>
                        <p className="font-medium text-gray-900">{formatPhoneNumber(riderInfo.phone_number)}</p>
                      </div>
                    )}
                    {riderInfo.vehicle_type && (
                      <div>
                        <p className="text-sm text-gray-500">Vehicle</p>
                        <p className="font-medium text-gray-900">{riderInfo.vehicle_type} ({riderInfo.vehicle_plate})</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No rider assigned yet</p>
                  </div>
                )}
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
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <div className="flex items-center gap-2">
                    {isEditingFee ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={feeInput}
                          onChange={(e) => setFeeInput(e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                        />
                        <button
                          onClick={saveDeliveryFee}
                          className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          title="Save fee"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelDeliveryFeeEdit}
                          className="p-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900">{formatCurrency(order.delivery_fee || 0)}</span>
                        <button
                          onClick={() => setIsEditingFee(true)}
                          className="p-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          title="Edit delivery fee"
                        >
                          <Edit3 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700">Grand Total</span>
                  <span className="text-blue-600">
                    {formatCurrency((order.total_amount || 0) + (order.delivery_fee || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Proof Section */}
            {order.status === 'Completed' && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <ImageIcon size={18} className="mr-2 text-blue-600" />
                  Proof of Delivery
                </h3>
                
                {loadingProofs ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">Loading delivery proofs...</p>
                  </div>
                ) : deliveryProofs && deliveryProofs.length > 0 ? (
                  <div className="space-y-4">
                    {deliveryProofs.map((proof, index) => (
                      <div key={proof.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Proof #{index + 1}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(proof.delivered_at)}
                            </p>
                          </div>
                          {proof.recipient_name && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {proof.recipient_name}
                            </span>
                          )}
                        </div>

                        {proof.photo_url && (
                          <div className="mb-3">
                            <img
                              src={proof.photo_url}
                              alt={`Delivery proof ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                              onClick={() => setSelectedProofImage(proof.photo_url)}
                            />
                          </div>
                        )}

                        {proof.notes && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                              {proof.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No delivery proofs available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        {selectedProofImage && (
          <div 
            className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[100] backdrop-blur-sm"
            onClick={() => setSelectedProofImage(null)}
          >
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-semibold">Delivery Proof Image</h3>
                <button 
                  onClick={() => setSelectedProofImage(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <img 
                  src={selectedProofImage} 
                  alt="Delivery proof full"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        )}

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