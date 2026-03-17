// src/components/RouteForce.jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteForce({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible - forcing route re-mount for:', location.pathname);
        // Force a complete re-mount by changing the key
        setKey(Date.now());
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          setIsVisible(true);
        }, 50);
      } else {
        setIsVisible(false);
      }
    };

    // Handle both visibility change and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [location.pathname]); // Re-run when path changes

  // If not visible, render nothing (helps clean up resources)
  if (!isVisible) {
    return <div style={{ display: 'none' }} />;
  }

  // Use a unique key that changes when tab becomes visible
  return <div key={key}>{children}</div>;
}