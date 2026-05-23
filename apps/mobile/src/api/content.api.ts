import { ApiResponse, ContentItem, SupportedLocale } from '@the-message/shared';
import { apiFetch } from './client';

export async function fetchDailyContent(locale: SupportedLocale): Promise<ContentItem | null> {
  const res = await apiFetch<ApiResponse<ContentItem | null>>(`/content/daily?locale=${locale}`);
  return res.data ?? null;
}
