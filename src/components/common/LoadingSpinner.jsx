// src/components/common/LoadingSpinner.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', fullPage = false, error = null }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  };

  const spinner = (
    <div className="flex flex-col justify-center items-center">
      {error ? (
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-petron-blue text-white rounded-lg hover:opacity-90"
          >
            Refresh Page
          </button>
        </div>
      ) : (
        <>
          <div
            className={`${sizes[size]} animate-spin rounded-full border-gray-200 border-t-blue-600`}
            role="status"
            aria-label="Loading"
          />
          <p className="text-gray-500 mt-2">Loading...</p>
        </>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}