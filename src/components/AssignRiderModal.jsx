// src/components/AssignRiderModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Truck, MapPin, Phone, User, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diffObjects, formatChangesDescription } from '../utils/diff';
import { notifySuccess } from '../utils/successNotifier';
import { useAdminLog } from '../hooks/useAdminLog';

export default function AssignRiderModal({ isOpen, onClose, order, onAssigned, availableRiders }) {
  const { logOrderAction } = useAdminLog();
  const [selectedRider, setSelectedRider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [riders, setRiders] = useState(availableRiders || []);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedRider('');
      setError('');
      setSuccess(false);
      setLoading(false);
      
      if (!riders.length || !availableRiders) {
        fetchAvailableRiders();
      }
    }
  }, [isOpen]);

  const fetchAvailableRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, vehicle_type, vehicle_plate, is_active')
        .eq('role', 'rider')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setRiders(data || []);
    } catch (err) {
      console.error('Error fetching riders:', err);
      setError('Failed to load available riders');
    }
  };

  const handleAssign = async () => {
    if (!selectedRider) {
      setError('Please select a rider');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          order_id: order.id,
          rider_id: selectedRider,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // 2. Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'Out for Delivery',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 3. Create notification for rider
      const { error: notifError } =await supabase
        .from('notifications')
        .insert([{
          user_id: order.user_id, // Customer
          type: 'order_status',
          title: 'Rider Assigned',
          message: `Your order #${order.id} has been assigned to a rider`
        }, {
          user_id: selectedRider, // Rider
          type: 'order_status',
          title: 'New Delivery',
          message: `You've been assigned to deliver order #${order.id}`
        }]);

      if (notifError) console.error('Error creating notification:', notifError);

      const changes = diffObjects(
        { status: order.status },
        { status: 'Out for Delivery' }
      );

      const description = formatChangesDescription(changes) || `Assigned rider and changed status from ${order.status} to Out for Delivery`;

      await logOrderAction(
        order.id,
        'assign_rider',
        { riderId: selectedRider, deliveryId: delivery?.id, ...changes },
        description
      );

      notifySuccess(description);
      setSuccess(true);
      
      // Close after showing success
      setTimeout(() => {
        onAssigned(); // This will trigger the parent's handleRiderAssigned
      }, 1500);

    } catch (err) {
      console.error('Error assigning rider:', err);
      setError(err.message || 'Failed to assign rider');
    } finally {
      setLoading(false);
    }
  };

  // Simple close function that does NOTHING else
  const handleClose = () => {
    setSelectedRider('');
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose(); // Just call the parent's onClose
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="bg-petron-blue p-6 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Truck className="mr-2" size={24} />
            Assign Rider
          </h3>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={40} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Rider Assigned Successfully!</h4>
              <p className="text-gray-500">
                Rider has been notified of the delivery assignment.
              </p>
            </div>
          ) : (
            <>
              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-500 mb-1">Order #{order?.id}</p>
                <p className="font-medium text-gray-900 mb-2">Delivery Address:</p>
                <p className="text-sm text-gray-600">{order?.delivery_address}</p>
                <div className="flex justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-gray-500">Total Amount:</span>
                  <span className="font-bold text-[#0033A0]">
                    ₱{order?.total_amount?.toFixed(2)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="text-red-500 mr-2" size={20} />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Rider Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Rider
                </label>
                
                {riders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <User className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500">No active riders available</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {riders.map((rider) => (
                      <label
                        key={rider.id}
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedRider === rider.id
                            ? 'border-[#0033A0] bg-[#E5EEFF]'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rider"
                          value={rider.id}
                          checked={selectedRider === rider.id}
                          onChange={(e) => setSelectedRider(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="font-medium text-gray-900">{rider.full_name}</p>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <Phone size={14} className="mr-1" />
                            {rider.phone_number}
                          </p>
                          {rider.vehicle_type && (
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Truck size={14} className="mr-1" />
                              {rider.vehicle_type} {rider.vehicle_plate && `(${rider.vehicle_plate})`}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}  // Use handleClose instead of onClose directly
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={loading || !selectedRider || riders.length === 0}
                  className="flex-1 py-2.5 bg-petron-blue text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Assigning...
                    </>
                  ) : (
                    'Assign Rider'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}