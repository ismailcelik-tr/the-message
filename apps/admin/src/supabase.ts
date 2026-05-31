import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://***REDACTED_SUPABASE_HOST***';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_X48w25YT9WycmQs3E9Gx8g_Usrz933O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
