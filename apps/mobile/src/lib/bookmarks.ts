import { ContentItem } from '@the-message/shared';
import { supabase } from './supabase';

export async function fetchBookmarks(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('content_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: { content_id: string }) => r.content_id);
}

export async function addBookmark(userId: string, item: ContentItem): Promise<void> {
  const { error } = await supabase.from('bookmarks').upsert({
    user_id: userId,
    content_id: item.id,
    content_type: item.type,
    snapshot: item,
  }, { onConflict: 'user_id,content_id' });
  if (error) throw error;
}

export async function removeBookmark(userId: string, contentId: string): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('content_id', contentId);
  if (error) throw error;
}
