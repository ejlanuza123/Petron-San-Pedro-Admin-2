// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Auth state:', { user, profile, loading, error });
    // If loading is stuck, log the issue
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('Auth loading stuck - checking session...');
        supabase.auth.getSession().then(({ data, error }) => {
          console.log('Session check:', { data, error });
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, loading, error]);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED fires every time the tab regains focus and Supabase
      // silently refreshes the JWT. We must NOT reset loading or re-fetch the
      // profile for this event — doing so causes the skeleton-lock bug.
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (session?.user) {
        // SIGNED_IN: only load profile when we don't already have one,
        // or when the user actually changed (e.g. a fresh login).
        await loadProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking user:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (data?.role === 'admin') {
        setUser(authUser);
        setProfile(data);
      } else {
        await supabase.auth.signOut();
        setError(
          `Access Denied: This dashboard is for admins only. Your role is: ${data?.role || 'unknown'}. If you are a rider, please use the mobile app.`
        );
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Profile will be loaded by onAuthStateChange
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
      setError(null);
      // Unblock the auth queue before signing out so the call never hangs.
      await supabase.auth.getSession().catch(() => {});
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      // Even on error, clear local state so the UI returns to login.
      setUser(null);
      setProfile(null);
      setError(err.message);
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