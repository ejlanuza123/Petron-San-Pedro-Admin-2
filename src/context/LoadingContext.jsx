import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loadingState, setLoadingState] = useState({
    global: false,
    operations: {}
  });

  const setGlobalLoading = useCallback((isLoading) => {
    setLoadingState(prev => ({ ...prev, global: isLoading }));
  }, []);

  const setOperationLoading = useCallback((operationId, isLoading) => {
    setLoadingState(prev => ({
      ...prev,
      operations: {
        ...prev.operations,
        [operationId]: isLoading
      }
    }));
  }, []);

  const isOperationLoading = useCallback((operationId) => {
    return loadingState.operations[operationId] || false;
  }, [loadingState]);

  return (
    <LoadingContext.Provider
      value={{
        isGlobalLoading: loadingState.global,
        setGlobalLoading,
        isOperationLoading,
        setOperationLoading
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
