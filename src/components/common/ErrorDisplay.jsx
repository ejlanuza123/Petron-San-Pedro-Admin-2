import React from 'react';
import { AlertCircle, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useError } from '../../context/ErrorContext';

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info
};

const colorMap = {
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' },
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-600' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-600' }
};

export const ErrorAlert = ({ errorId }) => {
  const { errors, clearError } = useError();
  const error = errors[errorId];

  if (!error) return null;

  const Icon = iconMap[error.type] || iconMap.error;
  const colors = colorMap[error.type] || colorMap.error;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 flex gap-3 items-start`}>
      <Icon size={20} className={`${colors.icon} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold ${colors.text}`}>{error.title}</h4>
        <p className={`text-sm ${colors.text} mt-1`}>{error.message}</p>
        {error.details && (
          <details className="mt-2">
            <summary className={`text-xs cursor-pointer ${colors.text} opacity-75`}>
              Details
            </summary>
            <pre className="text-xs mt-2 overflow-auto bg-black/5 p-2 rounded">
              {typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
      <button
        onClick={() => clearError(errorId)}
        className={`flex-shrink-0 ${colors.icon} hover:opacity-75 transition`}
      >
        <X size={20} />
      </button>
    </div>
  );
};

export const GlobalErrorDisplay = () => {
  const { errors } = useError();
  const errorIds = Object.keys(errors);

  if (errorIds.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 max-w-md space-y-2 z-40">
      {errorIds.map(errorId => (
        <ErrorAlert key={errorId} errorId={errorId} />
      ))}
    </div>
  );
};
