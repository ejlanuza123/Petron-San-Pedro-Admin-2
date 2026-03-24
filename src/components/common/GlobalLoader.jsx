import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLoading } from '../../context/LoadingContext';

export const GlobalLoader = () => {
  const { isGlobalLoading } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-700 font-medium">Loading...</p>
      </div>
    </div>
  );
};

export const OperationLoader = ({ operationId, children }) => {
  const { isOperationLoading } = useLoading();

  if (!isOperationLoading(operationId)) return children;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg z-40">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    </div>
  );
};
