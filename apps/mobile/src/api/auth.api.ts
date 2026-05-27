import { ApiResponse } from '@the-message/shared';
import { apiFetch } from './client';

export async function deleteAccount(accessToken: string): Promise<void> {
  await apiFetch<ApiResponse<null>>('/auth/account', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
