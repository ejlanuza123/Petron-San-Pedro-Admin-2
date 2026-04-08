// src/components/SuccessModal.jsx
import React from 'react';
import { createPortal } from 'react-dom';

export default function SuccessModal({ open, message, onClose }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 w-screen h-screen">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Success</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
