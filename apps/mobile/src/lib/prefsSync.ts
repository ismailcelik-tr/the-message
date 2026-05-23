import { UserPreferences } from '@the-message/shared';
import { supabase } from './supabase';

export async function fetchRemotePreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.preferences || Object.keys(data.preferences).length === 0) return null;
  return data.preferences as UserPreferences;
}

export async function upsertRemotePreferences(userId: string, preferences: UserPreferences): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, preferences }, { onConflict: 'id' });

  if (error) throw error;
}
