import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Bell, BellOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifySuccess } from '../utils/successNotifier';
import { pushNotificationService } from '../services/pushNotificationService';

export default function SettingsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('default');
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      setPermissionState(pushNotificationService.getPermissionState());
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setRequestingPermission(true);
      setError(null);

      const result = await pushNotificationService.requestPermission();
      const newState = result.permission || pushNotificationService.getPermissionState();
      setPermissionState(newState);

      if (result.success) {
        notifySuccess('Push notifications enabled.');
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('Unable to enable push notifications.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to request notification permission');
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleTestNotification = () => {
    const sent = pushNotificationService.sendNotification('Petron Admin Notification', {
      body: 'Push notifications are enabled for this admin panel.',
      tag: 'admin-settings-test',
    });

    if (sent) {
      notifySuccess('Test notification sent.');
      return;
    }

    setError('Could not send test notification. Enable notifications first.');
  };

  const isNotificationsEnabled = permissionState === 'granted';

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
                    <h3 className="font-semibold text-gray-900 mb-3">Push Notifications</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage browser notification permission for admin alerts and updates.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Current Permission</p>
                        <p className={`text-xl font-bold ${isNotificationsEnabled ? 'text-green-600' : 'text-gray-700'}`}>
                          {isNotificationsEnabled ? 'Enabled' : permissionState === 'denied' ? 'Blocked' : permissionState === 'unsupported' ? 'Unsupported' : 'Not Enabled'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleEnableNotifications}
                          disabled={requestingPermission || permissionState === 'unsupported' || isNotificationsEnabled}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Bell size={16} />
                            {requestingPermission ? 'Requesting...' : 'Enable'}
                          </span>
                        </button>
                        <button
                          onClick={handleTestNotification}
                          disabled={!isNotificationsEnabled}
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="inline-flex items-center gap-2">
                            <BellOff size={16} />
                            Test
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 pt-2">
                    <p><span className="font-semibold">How it works:</span></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Click Enable to request browser permission</li>
                      <li>When granted, admin alerts can appear in-browser</li>
                      <li>Use Test to verify notifications are working</li>
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
