// src/lib/03_supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Read from Vite env (must be defined in .env.local at project root)
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Opus] Missing Supabase env vars', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
  throw new Error('supabaseUrl is required. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose for quick console checks in DevTools
if (typeof window !== 'undefined' && !window.supabase) {
  window.supabase = supabase;
  console.log('[Opus] Supabase client ready — try in DevTools:', "await supabase.from('personas').select('id').limit(1)");
}
