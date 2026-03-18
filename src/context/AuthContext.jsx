// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple session checks
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    let mounted = true;
    let timeoutId = null;

    const checkUser = async () => {
      try {
        // Set a timeout for the session check
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('Session check timeout - forcing navigation to login');
            setLoading(false);
            setUser(null);
            setProfile(null);
          }
        }, 3000); // 3 second timeout

        // Try to get session with a timeout promise
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2500)
        );

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise.then(() => { throw new Error('Session check timeout'); })
        ]).catch(err => {
          console.error('Session check failed:', err);
          return { data: { session: null }, error: err };
        });

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Load profile in background
          await loadProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (authUser) => {
    try {
      // Add timeout for profile fetch
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const { data, error } = await Promise.race([
        profilePromise,
        timeoutPromise.then(() => { throw new Error('Profile fetch timeout'); })
      ]).catch(err => {
        console.error('Profile fetch failed:', err);
        return { data: null, error: err };
      });

      if (error) throw error;

      if (data?.role === 'admin') {
        setUser(authUser);
        setProfile(data);
      } else {
        await supabase.auth.signOut();
        setError('Access Denied: Admin only');
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Profile error:', err);
      setError(err.message);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setUser(null);
      setProfile(null);
    }
  };

  // FIXED: Changed from contextValue to value
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