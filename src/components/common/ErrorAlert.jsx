// src/components/common/ErrorAlert.jsx
import { AlertCircle, X } from 'lucide-react';

export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
        <div className="flex-1">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}