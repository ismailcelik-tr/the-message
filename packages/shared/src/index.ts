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
export type ContentType = 'verse' | 'hadith' | 'prayer' | 'dhikr' | 'esma' | 'worship' | 'notification' | 'audio' | 'article';
export type DayTime = 'morning' | 'noon' | 'evening' | 'any';
export type SupportedLocale = 'tr' | 'en';

export interface CategoryPreferences {
  hope: boolean;
  purpose: boolean;
  worship: boolean;
  prayer: boolean;
  dhikr: boolean;
}

export interface NotificationSlot {
  label: string; // e.g. 'morning', 'noon'
  time: string;  // HH:MM format
}

// low=1 slot, medium=3 slots, high=5 slots
export type NotificationSchedule = Record<NotificationFrequency, NotificationSlot[]>;

export interface UserPreferences {
  theme: ThemeType;
  notificationEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  notificationSchedule: NotificationSchedule;
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
  source?: string;
  title?: string;
  arabicText?: string;      // for esma: the Arabic script (e.g. "الرَّحْمَنُ")
  transliteration?: string; // for esma/dhikr: Latin-script pronunciation (e.g. "er-Rahmân")
}

export interface DailyBundle {
  esma: ContentItem;
  verse: ContentItem;
  hadith: ContentItem;
  prayer: ContentItem;
  worship: ContentItem;
}


export type FeedbackIssueType = 'wrong_text' | 'missing_text' | 'wrong_source' | 'other';
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved';

export interface ContentFeedback {
  contentId: string;
  contentType: ContentType;
  issueType: FeedbackIssueType;
  note?: string;
  locale: SupportedLocale;
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
