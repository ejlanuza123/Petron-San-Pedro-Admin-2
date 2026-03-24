import { useEffect, useState } from 'react';

/**
 * Hook to detect offline/online status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastChecked };
};
