// admin-web/src/components/common/AlertModal.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const AlertModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'success',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancelButton = false,
  onConfirm,
  loading = false
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const getIconByType = () => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' };
      case 'info':
      case 'confirm':
        return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' };
      default:
        return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' };
    }
  };

  const { icon: Icon, color, bg } = getIconByType();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto w-screen h-screen">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity w-screen h-screen"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button (only if not loading) */}
          {!loading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className="p-6">
            {/* Icon */}
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${bg} mb-4`}>
              <Icon className={`h-8 w-8 ${color}`} />
            </div>

            {/* Title */}
            {title && (
              <h3 className="text-center text-lg font-bold text-gray-900 mb-2">
                {title}
              </h3>
            )}

            {/* Message */}
            {message && (
              <p className="text-center text-sm text-gray-600 mb-6">
                {message}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {showCancelButton && (
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                >
                  {cancelText}
                </button>
              )}

              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`
                  flex-1 py-2.5 rounded-lg font-medium transition-all
                  ${showCancelButton ? '' : 'w-full'}
                  ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
                  ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}
                  ${type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                  ${type === 'info' || type === 'confirm' ? 'bg-petron-blue hover:bg-petron-blue-dark' : ''}
                  text-white disabled:opacity-50 flex items-center justify-center
                `}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Also create a hook for easier usage
export const useAlert = () => {
  const [alertState, setAlertState] = React.useState({
    isOpen: false,
    config: {}
  });

  const showAlert = (config) => {
    setAlertState({
      isOpen: true,
      config
    });
  };

  const hideAlert = () => {
    setAlertState({
      isOpen: false,
      config: {}
    });
  };

  const AlertComponent = () => (
    <AlertModal
      isOpen={alertState.isOpen}
      onClose={hideAlert}
      {...alertState.config}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
};

export default AlertModal;