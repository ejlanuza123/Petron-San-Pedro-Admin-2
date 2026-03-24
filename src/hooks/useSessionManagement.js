import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_WARNING = 5 * 60 * 1000; // 5 minutes before logout

/**
 * Hook for managing session timeout and inactivity
 */
export const useSessionManagement = () => {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(SESSION_TIMEOUT);
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const warningTimerRef = useRef(null);

  const resetTimeout = () => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);

    setShowWarning(false);
    setRemainingTime(SESSION_TIMEOUT);

    // Set warning timeout (show warning 5 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(INACTIVITY_WARNING);

      // Start countdown timer
      let remaining = INACTIVITY_WARNING;
      warningTimerRef.current = setInterval(() => {
        remaining -= 1000;
        setRemainingTime(remaining);

        if (remaining <= 0) {
          clearInterval(warningTimerRef.current);
        }
      }, 1000);
    }, SESSION_TIMEOUT - INACTIVITY_WARNING);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);
  };

  const extendSession = () => {
    setShowWarning(false);
    resetTimeout();
  };

  useEffect(() => {
    resetTimeout();

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [logout]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    logout
  };
};
