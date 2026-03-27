// src/hooks/useAuth.js
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (context?.loading) {
        console.warn('Auth loading timeout reached - forcing completion');
        setTimeoutReached(true);
      }
    }, 15000); // 15 second timeout - increased to handle slow networks
    
    return () => clearTimeout(timer);
  }, [context?.loading]);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // If we're still loading but timeout reached, treat as not authenticated
  const loading = context.loading && !timeoutReached;
  const isAuthenticated = context.isAuthenticated || false;
  
  return {
    ...context,
    loading,
    isAuthenticated,
    timeoutReached
  };
}