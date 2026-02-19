import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://etypzzzobbacpvwvjhuf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eXB6enpvYmJhY3B2d3ZqaHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Njk4ODYsImV4cCI6MjA4NjI0NTg4Nn0.t4cUuBxek7XQEviue8LObUl2DMDCCcdnzZ3sWA6_O74'; // Use the same key from your mobile app

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);