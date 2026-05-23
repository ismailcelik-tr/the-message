/**
 * Shared Type Definitions for Çağrı (The Message) Application.
 */

export interface SilentHours {
  start: string; // HH:MM format (24-hour style)
  end: string;   // HH:MM format (24-hour style)
  enabled: boolean;
}

export type ThemeType = 'light' | 'dark' | 'system';
export type NotificationFrequency = 'low' | 'medium' | 'high'; // 1, 3, or 5 reminder times per day
export type MessageCategory = 'hope' | 'purpose' | 'worship' | 'prayer' | 'dhikr';
export type ContentType = 'verse' | 'hadith' | 'prayer' | 'dhikr' | 'audio' | 'article';
export type DayTime = 'morning' | 'noon' | 'evening' | 'any';
export type SupportedLocale = 'tr' | 'en';

export interface CategoryPreferences {
  hope: boolean;
  purpose: boolean;
  worship: boolean;
  prayer: boolean;
  dhikr: boolean;
}

export interface UserPreferences {
  theme: ThemeType;
  notificationEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  categoryPreferences: CategoryPreferences;
  silentHours: SilentHours;
  locale: SupportedLocale;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  category: MessageCategory;
  recommendedTime: DayTime;
  date: string; // YYYY-MM-DD format
  translations: Record<SupportedLocale, ContentTranslation>;
  audioUrl?: string; // S3 URL, only for type 'audio'
  imageUrl?: string; // S3 URL, only for type 'article'
}

export interface ContentTranslation {
  content: string;
  source?: string; // e.g. "Bakara Suresi, 286. Ayet" or "Quran 2:286"
  title?: string;  // for article type
}

/** @deprecated Use ContentItem instead. Kept for backward compatibility during migration. */
export interface DailyMessage {
  id: string;
  content: string;
  source?: string;
  category: MessageCategory;
  recommendedTime: DayTime;
  date: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
