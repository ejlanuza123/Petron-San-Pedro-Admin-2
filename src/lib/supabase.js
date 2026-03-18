// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. CREATE THE CLIENT FIRST
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. ATTACH THE LISTENER AFTER THE CLIENT EXISTS
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Force the Auth module to unblock its queue
      supabase.auth.getSession().catch(() => {});
      
      // Force a clean Realtime reconnection
      supabase.realtime.connect();
    } else {
      // Cleanly sever the connection when the tab sleeps
      supabase.realtime.disconnect();
    }
  });
}