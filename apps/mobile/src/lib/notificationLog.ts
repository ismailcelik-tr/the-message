import { ContentItem, DailyBundle, UserPreferences } from '@the-message/shared';
import { supabase } from './supabase';

export interface NotificationLogItem {
  id: string;         // deterministic: date + slot index
  scheduledTime: string; // HH:MM
  sentAt: Date;
  content: ContentItem;
}

// Maps slot label → which bundle card to show
const SLOT_CARD_MAP: Record<string, keyof DailyBundle> = {
  morning:    'verse',
  midMorning: 'esma',
  noon:       'hadith',
  afternoon:  'esma',
  evening:    'prayer',
};

export function buildTodayNotifications(
  bundle: DailyBundle,
  prefs: UserPreferences,
  todayStr: string, // YYYY-MM-DD
): NotificationLogItem[] {
  if (!prefs.notificationEnabled) return [];

  const slots = prefs.notificationSchedule[prefs.notificationFrequency];
  const now = new Date();

  return slots
    .map((slot, index) => {
      const [hh, mm] = slot.time.split(':').map(Number);
      const scheduledDate = new Date(todayStr);
      scheduledDate.setHours(hh, mm, 0, 0);

      const cardKey = SLOT_CARD_MAP[slot.label] ?? 'verse';
      const content = bundle[cardKey];

      return {
        id: `notif-${todayStr}-${index}`,
        scheduledTime: slot.time,
        sentAt: scheduledDate,
        content,
      };
    })
    .filter((item) => item.sentAt <= now);
}

export function getNextNotificationTime(
  prefs: UserPreferences,
  todayStr: string,
): string | null {
  if (!prefs.notificationEnabled) return null;
  const slots = prefs.notificationSchedule[prefs.notificationFrequency];
  const now = new Date();
  for (const slot of slots) {
    const [hh, mm] = slot.time.split(':').map(Number);
    const scheduledDate = new Date(todayStr);
    scheduledDate.setHours(hh, mm, 0, 0);
    if (scheduledDate > now) return slot.time;
  }
  return null;
}

// Saves a notification log item as a bookmark (type: 'notification')
export async function saveNotificationBookmark(
  userId: string,
  logItem: NotificationLogItem,
  todayStr: string,
): Promise<void> {
  const snapshot: ContentItem = {
    ...logItem.content,
    id: logItem.id,
    type: 'notification',
    date: todayStr,
  };

  const { error } = await supabase.from('bookmarks').upsert({
    user_id: userId,
    content_id: logItem.id,
    content_type: 'notification',
    snapshot,
  }, { onConflict: 'user_id,content_id' });

  if (error) throw error;
}
