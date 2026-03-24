import React, { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext();

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState({});

  const setError = useCallback((errorId, error) => {
    setErrors(prev => ({
      ...prev,
      [errorId]: {
        message: error?.message || 'An error occurred',
        details: error?.details || null,
        title: error?.title || 'Error',
        timestamp: new Date(),
        type: error?.type || 'error'
      }
    }));
  }, []);

  const clearError = useCallback((errorId) => {
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[errorId];
      return updated;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getError = useCallback((errorId) => {
    return errors[errorId] || null;
  }, [errors]);

  return (
    <ErrorContext.Provider
      value={{
        errors,
        setError,
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
