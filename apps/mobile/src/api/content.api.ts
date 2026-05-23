import { ApiResponse, ContentItem, DailyBundle, SupportedLocale } from '@the-message/shared';
import { apiFetch } from './client';

export async function fetchDailyContent(locale: SupportedLocale): Promise<ContentItem | null> {
  const res = await apiFetch<ApiResponse<ContentItem | null>>(`/content/daily?locale=${locale}`);
  return res.data ?? null;
}

export async function fetchDailyBundle(locale: SupportedLocale): Promise<DailyBundle> {
  const res = await apiFetch<ApiResponse<DailyBundle>>(`/content/daily-bundle?locale=${locale}`);
  if (!res.data) throw new Error('Empty bundle response');
  return res.data;
}
