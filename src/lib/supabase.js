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

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    // ONLY trigger when the user returns to the tab.
    // We do nothing when the tab is hidden to ensure F5/page refreshes 
    // can unload the document cleanly without corrupting the Auth lock.
    if (document.visibilityState === 'visible') {
      // 1. Restart the background timer safely
      supabase.auth.startAutoRefresh();
      
      // 2. Force an immediate session check to unblock hanging queries
      supabase.auth.getSession().catch(console.error);
    }
  });
}