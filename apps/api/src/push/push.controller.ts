import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
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
  async audienceCount(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-push-secret') secretHeader: string | undefined,
    @Body() filters: PushAudienceFilters,
  ): Promise<ApiResponse<PushAudienceCount>> {
    this.pushService.assertAdmin(authHeader, secretHeader);
    const data = await this.pushService.countAudience(filters);
    return { success: true, data };
  }

  @Post('admin/push/campaigns')
  async createCampaign(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-push-secret') secretHeader: string | undefined,
    @Body() body: PushCampaignRequest,
  ): Promise<ApiResponse<PushCampaign>> {
    this.pushService.assertAdmin(authHeader, secretHeader);
    const data = await this.pushService.createCampaign(body);
    return { success: true, data };
  }

  @Post('admin/push/campaigns/:id/send')
  async sendCampaign(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-push-secret') secretHeader: string | undefined,
    @Param('id') id: string,
  ): Promise<ApiResponse<PushCampaign>> {
    this.pushService.assertAdmin(authHeader, secretHeader);
    const data = await this.pushService.sendCampaign(id);
    return { success: true, data };
  }

  @Post('admin/push/process-due')
  async processDueCampaigns(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-push-secret') secretHeader: string | undefined,
  ): Promise<ApiResponse<PushCampaign[]>> {
    this.pushService.assertAdmin(authHeader, secretHeader);
    const data = await this.pushService.processDueCampaigns();
    return { success: true, data };
  }

  @Get('admin/push/campaigns')
  async listCampaigns(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-push-secret') secretHeader: string | undefined,
  ): Promise<ApiResponse<PushCampaign[]>> {
    this.pushService.assertAdmin(authHeader, secretHeader);
    const data = await this.pushService.listCampaigns();
    return { success: true, data };
  }
}
