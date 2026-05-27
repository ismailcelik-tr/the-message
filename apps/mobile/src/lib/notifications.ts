import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserPreferences, DailyBundle, SilentHours } from '@the-message/shared';
import { fetchDailyBundle } from '../api/content.api';

// Show notification as banner + sound when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Çağrı',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Returns minutes since midnight for a "HH:MM" string
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isInSilentWindow(timeHHMM: string, silent: SilentHours): boolean {
  if (!silent.enabled) return false;

  const t = toMinutes(timeHHMM);
  const start = toMinutes(silent.start);
  const end = toMinutes(silent.end);

  // Window can wrap midnight (e.g. 22:00 – 06:00)
  if (start > end) {
    return t >= start || t < end;
  }
  return t >= start && t < end;
}

/**
 * Cancels all pending scheduled notifications and re-schedules based on current
 * preferences. Fetches a separate bundle for each day so content rotates daily.
 *
 * Only schedules for the next 14 days to stay within OS limits (~64 on iOS).
 */
export async function rescheduleNotifications(
  prefs: UserPreferences,
  todayBundle: DailyBundle,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!prefs.notificationEnabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const slots = prefs.notificationSchedule[prefs.notificationFrequency];
  const now = new Date();
  const locale = prefs.locale ?? 'tr';

  const SLOT_CONTENT_MAP: Record<string, keyof DailyBundle> = {
    morning: 'verse',
    midMorning: 'esma',
    noon: 'hadith',
    afternoon: 'esma',
    evening: 'prayer',
  };

  const SLOT_LABEL_TR: Record<string, string> = {
    morning: 'Sabah',
    midMorning: 'Kuşluk',
    noon: 'Öğle',
    afternoon: 'İkindi',
    evening: 'Akşam',
  };

  const SLOT_LABEL_EN: Record<string, string> = {
    morning: 'Morning',
    midMorning: 'Mid-Morning',
    noon: 'Noon',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };

  // Cache bundles per date string to avoid redundant API calls
  const bundleCache = new Map<string, DailyBundle>();
  bundleCache.set(now.toISOString().split('T')[0], todayBundle);

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() + dayOffset);
    const dateStr = dayDate.toISOString().split('T')[0];

    let bundle = bundleCache.get(dateStr);
    if (!bundle) {
      try {
        bundle = await fetchDailyBundle(locale, prefs.categoryPreferences, dateStr);
        bundleCache.set(dateStr, bundle);
      } catch {
        bundle = todayBundle; // fallback to today's bundle on network error
      }
    }

    for (const slot of slots) {
      if (isInSilentWindow(slot.time, prefs.silentHours)) continue;

      const [hh, mm] = slot.time.split(':').map(Number);
      const trigger = new Date(dayDate);
      trigger.setHours(hh, mm, 0, 0);

      if (trigger <= now) continue;

      const cardKey = SLOT_CONTENT_MAP[slot.label] ?? 'verse';
      const item = bundle[cardKey];
      const translation = item.translations[locale] ?? item.translations['tr'];

      const slotLabel = locale === 'tr'
        ? (SLOT_LABEL_TR[slot.label] ?? slot.label)
        : (SLOT_LABEL_EN[slot.label] ?? slot.label);
      const title = locale === 'tr' ? `${slotLabel} — Çağrı` : `${slotLabel} — The Message`;
      const rawContent = translation.content;
      const source = translation.source;
      const full = source ? `${rawContent} — ${source}` : rawContent;
      const body = full.length > 180 ? full.slice(0, 177) + '…' : full;

      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      });
    }
  }
}
