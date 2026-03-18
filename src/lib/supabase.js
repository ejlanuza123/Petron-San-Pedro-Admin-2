// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Handle browser tab sleeping/waking to prevent Auth Promise Deadlocks
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // 1. Tab is hidden: Stop the background token refresh timer
      // This prevents the browser from throttling it and causing a permanent lock.
      supabase.auth.stopAutoRefresh();
    } else {
      // 2. Tab is active again: Restart the refresh timer
      supabase.auth.startAutoRefresh();
      
      // 3. Force an immediate session check to unblock any hanging database queries
      supabase.auth.getSession().catch(console.error);
    }
  });
}