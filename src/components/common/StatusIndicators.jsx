import React from 'react';
import { WiFiOff, AlertTriangle, LogOut } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator = () => {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2 shadow-lg z-50">
      <WiFiOff size={18} />
      <span>You are offline. Your changes will be synced when you reconnect.</span>
    </div>
  );
};

export const SessionWarning = ({ showWarning, remainingTime, onExtend, onLogout }) => {
  if (!showWarning) return null;

  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-yellow-600" size={32} />
          <h2 className="text-xl font-bold text-gray-900">Session Expiring Soon</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Your session will expire in{' '}
          <span className="font-semibold text-red-600">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
          >
            Continue Working
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
