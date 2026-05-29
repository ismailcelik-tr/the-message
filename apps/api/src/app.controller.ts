import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponse } from '@the-message/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): ApiResponse<{ status: string }> {
    return {
      success: true,
      data: { status: 'healthy' },
    };
  }
}
