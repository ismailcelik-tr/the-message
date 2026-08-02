import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vite inlines these at build time. Without them the panel would silently point
// at an unreachable host, so fail loudly instead of shipping a broken bundle.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Admin paneli yapılandırılamadı: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY build sırasında tanımlı olmalı.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
