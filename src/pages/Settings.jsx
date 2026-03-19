import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import ErrorAlert from '../components/common/ErrorAlert';
import { notifySuccess } from '../utils/successNotifier';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('');
  const [tempFeeInput, setTempFeeInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch the default delivery fee from app_settings table
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
        // Default to 50 if not set
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

      // Try to update or insert the setting
      const { data: existingSetting } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'default_delivery_fee')
        .single();

      if (existingSetting) {
        // Update existing
        const { error: updateError } = await supabase
          .from('app_settings')
          .update({
            value: feeValue.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('key', 'default_delivery_fee');

        if (updateError) throw updateError;
      } else {
        // Insert new
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon size={28} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Configure application-wide settings</p>
        </div>

        {/* Error Alert */}
        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="space-y-6">
            {/* Default Delivery Fee Section */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Default Delivery Fee</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    This fee will be applied to all new orders. Riders will earn based on the delivery fee set for each order.
                  </p>
                </div>
              </div>

              {!isEditing ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">
                      ₱{parseFloat(defaultDeliveryFee || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Current default delivery fee</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setTempFeeInput(defaultDeliveryFee);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Edit Fee
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
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      This fee will apply to all new orders. Existing orders will keep their configured fees.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Settings Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">1.</span>
                  <span>Set the default delivery fee above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">2.</span>
                  <span>New orders will automatically use this fee (unless manually changed)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">3.</span>
                  <span>Each individual order's fee can be customized in the order details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">4.</span>
                  <span>Riders earn the delivery fee amount when they complete a delivery</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
