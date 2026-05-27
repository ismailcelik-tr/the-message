import { ContentFeedback } from '@the-message/shared';
import { apiFetch } from './client';

export async function submitFeedback(
  feedback: ContentFeedback,
  userId?: string,
): Promise<void> {
  await apiFetch('/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    body: JSON.stringify(feedback),
  });
}
