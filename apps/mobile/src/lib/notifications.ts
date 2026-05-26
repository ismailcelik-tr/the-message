import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserPreferences, DailyBundle, SilentHours } from '@the-message/shared';

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
 * preferences. Call this on app start and whenever preferences change.
 *
 * Only schedules for the next 14 days to stay within OS limits (~64 on iOS).
 */
export async function rescheduleNotifications(
  prefs: UserPreferences,
  bundle: DailyBundle,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!prefs.notificationEnabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const slots = prefs.notificationSchedule[prefs.notificationFrequency];
  const now = new Date();

  // Map slot label → bundle card content
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

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    for (const slot of slots) {
      if (isInSilentWindow(slot.time, prefs.silentHours)) continue;

      const [hh, mm] = slot.time.split(':').map(Number);
      const trigger = new Date(now);
      trigger.setDate(now.getDate() + dayOffset);
      trigger.setHours(hh, mm, 0, 0);

      // Skip times already past today
      if (trigger <= now) continue;

      const cardKey = SLOT_CONTENT_MAP[slot.label] ?? 'verse';
      const item = bundle[cardKey];
      const locale = prefs.locale ?? 'tr';
      const translation = item.translations[locale] ?? item.translations['tr'];

      const slotLabel = SLOT_LABEL_TR[slot.label] ?? slot.label;
      const title = `${slotLabel} — Çağrı`;
      const body = translation.content.length > 120
        ? translation.content.slice(0, 117) + '…'
        : translation.content;

      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      });
    }
  }
}
