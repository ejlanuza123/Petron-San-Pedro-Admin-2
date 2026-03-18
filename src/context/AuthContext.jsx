// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load profile with retry and longer timeout
  const loadProfile = useCallback(async (authUser, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      console.log(`Loading profile for ${authUser.email} (attempt ${retryCount + 1})...`);
      
      // Increase timeout to 10 seconds for Vercel
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      clearTimeout(timeoutId);

      if (error) throw error;

      if (data?.role === 'admin') {
        console.log('Profile loaded successfully:', data.full_name);
        setUser(authUser);
        setProfile(data);
        setLoading(false);
      } else {
        await supabase.auth.signOut();
        setError('Access Denied: Admin only');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    } catch (err) {
      console.error(`Profile fetch attempt ${retryCount + 1} failed:`, err.message);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying profile fetch in ${(retryCount + 1) * 2} seconds...`);
        setTimeout(() => {
          loadProfile(authUser, retryCount + 1);
        }, (retryCount + 1) * 2000); // Exponential backoff: 2s, 4s, 6s
      } else {
        console.error('Max retries reached for profile fetch');
        setError('Unable to load profile. Please refresh.');
        setLoading(false);
      }
    }
  }, []);

  // Initial session check
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;

    const checkSession = async () => {
      try {
        setLoading(true);
        
        // Check localStorage first
        const authKey = Object.keys(localStorage).find(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        
        console.log('Checking session...', { 
          hasAuthKey: !!authKey,
          attempt: ++checkCount 
        });

        if (!authKey) {
          console.log('No auth key in localStorage');
          setLoading(false);
          return;
        }

        // Try to get session with longer timeout
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Session found, loading profile...');
          await loadProfile(session.user);
        } else {
          console.log('No session found');
          setLoading(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      // Profile will be loaded by onAuthStateChange
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      // Don't set loading false here - let the auth event handle it
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};