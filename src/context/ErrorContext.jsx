import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ErrorContext = createContext();

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState({});
  const timersRef = useRef({});

  const clearError = useCallback((errorId) => {
    if (timersRef.current[errorId]) {
      clearTimeout(timersRef.current[errorId]);
      delete timersRef.current[errorId];
    }
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[errorId];
      return updated;
    });
  }, []);

  const setError = useCallback((errorId, error, autoDismissMs = 0) => {
    if (timersRef.current[errorId]) {
      clearTimeout(timersRef.current[errorId]);
      delete timersRef.current[errorId];
    }

    setErrors(prev => ({
      ...prev,
      [errorId]: {
        id: errorId,
        message: error?.message || 'An error occurred',
        details: error?.details || null,
        title: error?.title || (error?.type === 'success' ? 'Success' : error?.type === 'warning' ? 'Warning' : 'Error'),
        timestamp: new Date(),
        type: error?.type || 'error'
      }
    }));

    if (autoDismissMs > 0) {
      timersRef.current[errorId] = setTimeout(() => {
        clearError(errorId);
      }, autoDismissMs);
    }
  }, [clearError]);

  const showToast = useCallback((message, type = 'error', title = null, durationMs = 5000) => {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setError(toastId, {
      message,
      title: title || (type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Error'),
      type
    }, durationMs);
    return toastId;
  }, [setError]);

  const clearAllErrors = useCallback(() => {
    Object.keys(timersRef.current).forEach(id => clearTimeout(timersRef.current[id]));
    timersRef.current = {};
    setErrors({});
  }, []);

  const getError = useCallback((errorId) => {
    return errors[errorId] || null;
  }, [errors]);

  useEffect(() => {
    return () => {
      Object.keys(timersRef.current).forEach(id => clearTimeout(timersRef.current[id]));
    };
  }, []);

  return (
    <ErrorContext.Provider
      value={{
        errors,
        setError,
        showToast,
        clearError,
        clearAllErrors,
        getError
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};

