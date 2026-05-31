import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
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

export async function getExpoPushToken(): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
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

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cancels all pending scheduled local notifications as we move to a backend-driven
 * push notification architecture.
 */
export async function rescheduleNotifications(
  _prefs: UserPreferences,
  _todayBundle?: DailyBundle,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
