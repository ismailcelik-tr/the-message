import { ApiResponse, CategoryPreferences, ContentItem, DailyBundle, SupportedLocale } from '@the-message/shared';
import { apiFetch } from './client';

export async function fetchDailyContent(locale: SupportedLocale): Promise<ContentItem | null> {
  const res = await apiFetch<ApiResponse<ContentItem | null>>(`/content/daily?locale=${locale}`);
  return res.data ?? null;
}

export async function fetchDailyBundle(
  locale: SupportedLocale,
  categoryPreferences?: CategoryPreferences,
  date?: string,
): Promise<DailyBundle> {
  let url = `/content/daily-bundle?locale=${locale}`;

  if (categoryPreferences) {
    const active = (Object.keys(categoryPreferences) as (keyof CategoryPreferences)[])
      .filter((k) => categoryPreferences[k]);
    if (active.length > 0) {
      url += `&categories=${active.join(',')}`;
    }
  }

  if (date) {
    url += `&date=${date}`;
  }

  const res = await apiFetch<ApiResponse<DailyBundle>>(url);
  if (!res.data) throw new Error('Empty bundle response');
  return res.data;
}
