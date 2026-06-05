import { apiFetch } from './client';
import { supabase } from '../lib/supabase';
import { ApiResponse, ContentItem, PaginatedResponse } from '@the-message/shared';

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`
  };
}

export async function fetchPendingContent(
  page = 1,
  limit = 20,
  isActive = false,
  search?: string,
  type?: string
): Promise<PaginatedResponse<ContentItem & { isActive: boolean }>> {
  const headers = await getHeaders();
  let url = `/admin/content?isActive=${isActive}&page=${page}&limit=${limit}`;
  if (search?.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  if (type) {
    url += `&type=${type}`;
  }
  const res = await apiFetch<ApiResponse<PaginatedResponse<ContentItem & { isActive: boolean }>>>(
    url,
    { headers }
  );
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch pending content');
  return res.data;
}

export async function updateContentItem(id: string, body: any): Promise<ContentItem> {
  const headers = await getHeaders();
  const res = await apiFetch<ApiResponse<ContentItem>>(
    `/admin/content/${id}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    }
  );
  if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update content');
  return res.data;
}

export async function deleteContentItem(id: string): Promise<void> {
  const headers = await getHeaders();
  const res = await apiFetch<ApiResponse<null>>(
    `/admin/content/${id}`,
    {
      method: 'DELETE',
      headers
    }
  );
  if (!res.success) throw new Error(res.error?.message || 'Failed to delete content');
}
