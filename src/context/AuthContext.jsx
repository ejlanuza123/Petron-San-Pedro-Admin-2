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
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
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

      // Check if user has admin role
      if (data?.role === 'admin') {
        setUser(authUser);
        setProfile(data);
      } else {
        // Not an admin, sign them out
        await supabase.auth.signOut();
        setError('Access Denied: You do not have admin privileges.');
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
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
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
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};