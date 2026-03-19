import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { notifySuccess } from '../utils/successNotifier';

export default function SettingsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('');
  const [tempFeeInput, setTempFeeInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'default_delivery_fee')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setDefaultDeliveryFee(data.value);
        setTempFeeInput(data.value);
      } else {
        setDefaultDeliveryFee('50');
        setTempFeeInput('50');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const feeValue = parseFloat(tempFeeInput);
      if (isNaN(feeValue) || feeValue < 0) {
        setError('Please enter a valid delivery fee amount');
        setSaving(false);
        return;
      }

      const { data: existingSetting } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'default_delivery_fee')
        .single();

      if (existingSetting) {
        const { error: updateError } = await supabase
          .from('app_settings')
          .update({
            value: feeValue.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('key', 'default_delivery_fee');

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({
            key: 'default_delivery_fee',
            value: feeValue.toString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      setDefaultDeliveryFee(feeValue.toString());
      setIsEditing(false);
      notifySuccess(`Default delivery fee updated to ₱${feeValue}`);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempFeeInput(defaultDeliveryFee);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="bg-white rounded-lg w-full max-w-md shadow-xl"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-blue-50">
              <div className="flex items-center gap-2">
                <SettingsIcon size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white rounded-lg transition"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Default Delivery Fee</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This fee applies to all new orders. Riders earn this amount per delivery.
                    </p>

                    {!isEditing ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-3xl font-bold text-blue-600">
                            ₱{parseFloat(defaultDeliveryFee || 0).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setTempFeeInput(defaultDeliveryFee);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Fee (₱)
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-700">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tempFeeInput}
                              onChange={(e) => setTempFeeInput(e.target.value)}
                              placeholder="Enter delivery fee"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                          <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800">
                            Applies to new orders only. Existing orders keep their current fees.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 pt-2">
                    <p><span className="font-semibold">How it works:</span></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Default fee applies to new orders</li>
                      <li>Customize per-order fees in order details</li>
                      <li>Riders earn the delivery fee amount</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
