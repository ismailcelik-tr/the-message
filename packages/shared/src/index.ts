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
export type DayTime = 'morning' | 'noon' | 'evening' | 'any';

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
}

export interface DailyMessage {
  id: string;
  content: string;
  source?: string; // e.g., Quran Verse, Hadith, Quote
  category: MessageCategory;
  recommendedTime: DayTime;
  date: string; // YYYY-MM-DD format
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
