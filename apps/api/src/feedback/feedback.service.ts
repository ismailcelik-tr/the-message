import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ContentFeedback } from '@the-message/shared';
import ws from 'ws';

@Injectable()
export class FeedbackService {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { realtime: { transport: ws as any } },
  );

  async submit(feedback: ContentFeedback, userId?: string): Promise<void> {
    const { error } = await this.supabase.from('content_feedback').insert({
      content_id: feedback.contentId,
      content_type: feedback.contentType,
      issue_type: feedback.issueType,
      note: feedback.note ?? null,
      locale: feedback.locale,
      user_id: userId ?? null,
      status: 'pending',
    });

    if (error) throw new InternalServerErrorException('Feedback could not be saved');
  }
}
