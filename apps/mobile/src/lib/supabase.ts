import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Create apps/mobile/.env.local with:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>\n' +
    '  EXPO_PUBLIC_API_URL=http://<local-ip>:3000/api',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
