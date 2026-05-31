import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiResponse,
  PushAudienceCount,
  PushAudienceFilters,
  PushCampaign,
  PushCampaignRequest,
  RegisterPushTokenRequest,
  UpdatePushPreferencesRequest,
} from '@the-message/shared';
import { PushService } from './push.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('push/register-token')
  async registerToken(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: RegisterPushTokenRequest,
  ): Promise<ApiResponse<null>> {
    await this.pushService.registerToken(authHeader, body);
    return { success: true, data: null };
  }

  @Patch('push/preferences')
  async updatePreferences(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: UpdatePushPreferencesRequest,
  ): Promise<ApiResponse<null>> {
    await this.pushService.updatePreferences(authHeader, body);
    return { success: true, data: null };
  }

  @Post('admin/push/audience-count')
  @UseGuards(AdminGuard)
  async audienceCount(
    @Body() filters: PushAudienceFilters,
  ): Promise<ApiResponse<PushAudienceCount>> {
    const data = await this.pushService.countAudience(filters);
    return { success: true, data };
  }

  @Post('admin/push/campaigns')
  @UseGuards(AdminGuard)
  async createCampaign(
    @Body() body: PushCampaignRequest,
  ): Promise<ApiResponse<PushCampaign>> {
    const data = await this.pushService.createCampaign(body);
    return { success: true, data };
  }

  @Post('admin/push/campaigns/:id/send')
  @UseGuards(AdminGuard)
  async sendCampaign(
    @Param('id') id: string,
  ): Promise<ApiResponse<PushCampaign>> {
    const data = await this.pushService.sendCampaign(id);
    return { success: true, data };
  }

  @Post('admin/push/process-due')
  @UseGuards(AdminGuard)
  async processDueCampaigns(): Promise<ApiResponse<PushCampaign[]>> {
    const data = await this.pushService.processDueCampaigns();
    return { success: true, data };
  }

  @Get('admin/push/campaigns')
  @UseGuards(AdminGuard)
  async listCampaigns(): Promise<ApiResponse<PushCampaign[]>> {
    const data = await this.pushService.listCampaigns();
    return { success: true, data };
  }
}
