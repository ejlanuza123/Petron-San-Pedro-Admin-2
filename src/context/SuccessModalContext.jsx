// src/context/SuccessModalContext.jsx
import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import SuccessModal from '../components/SuccessModal';
import { registerSuccessHandler, clearSuccessHandler } from '../utils/successNotifier';

const SuccessModalContext = createContext(null);

export function SuccessModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const showSuccess = useCallback((msg) => {
    setMessage(msg || 'Action completed successfully.');
    setOpen(true);
  }, []);

  const hideSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    registerSuccessHandler(showSuccess);
    return () => {
      clearSuccessHandler();
    };
  }, [showSuccess]);

  return (
    <SuccessModalContext.Provider value={{ showSuccess, hideSuccess }}>
      {children}
      <SuccessModal open={open} message={message} onClose={hideSuccess} />
    </SuccessModalContext.Provider>
  );
}

export function useSuccessModal() {
  const ctx = useContext(SuccessModalContext);
  if (!ctx) {
    throw new Error('useSuccessModal must be used within SuccessModalProvider');
  }
  return ctx;
}
