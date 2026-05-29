import { Platform } from 'react-native';
import { RegisterPushTokenRequest, SupportedLocale, UpdatePushPreferencesRequest } from '@the-message/shared';
import { apiFetch } from './client';

export async function registerPushToken(
  accessToken: string,
  token: string,
  locale: SupportedLocale,
  notificationEnabled: boolean,
): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  const body: RegisterPushTokenRequest = {
    token,
    platform: Platform.OS,
    locale,
    notificationEnabled,
  };

  await apiFetch('/push/register-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

export async function updatePushPreferences(
  accessToken: string,
  notificationEnabled: boolean,
): Promise<void> {
  const body: UpdatePushPreferencesRequest = { notificationEnabled };

  await apiFetch('/push/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}
