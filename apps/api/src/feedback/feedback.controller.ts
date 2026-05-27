import { Body, Controller, HttpCode, Post, Headers } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ContentFeedback, ApiResponse } from '@the-message/shared';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(201)
  async submit(
    @Body() body: ContentFeedback,
    @Headers('x-user-id') userId?: string,
  ): Promise<ApiResponse<null>> {
    await this.feedbackService.submit(body, userId);
    return { success: true, data: null };
  }
}
