import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { ApiResponse, ContentItem, DailyBundle, MessageCategory, PaginatedResponse, SupportedLocale } from '@the-message/shared';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('daily')
  async getDaily(
    @Query('locale') locale: SupportedLocale = 'tr',
  ): Promise<ApiResponse<ContentItem | null>> {
    const data = await this.contentService.findDaily(locale);
    return { success: true, data };
  }

  @Get('daily-bundle')
  async getDailyBundle(
    @Query('locale') locale: SupportedLocale = 'tr',
    @Query('categories') categoriesParam?: string,
  ): Promise<ApiResponse<DailyBundle>> {
    const activeCategories = categoriesParam
      ? (categoriesParam.split(',').filter(Boolean) as MessageCategory[])
      : undefined;
    const data = await this.contentService.findDailyBundle(locale, activeCategories);
    return { success: true, data };
  }

  @Get()
  async getAll(
    @Query('locale') locale: SupportedLocale = 'tr',
    @Query('category') category?: MessageCategory,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<PaginatedResponse<ContentItem>>> {
    const data = await this.contentService.findAll(locale, category, Number(page), Number(limit));
    return { success: true, data };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ApiResponse<ContentItem>> {
    const data = await this.contentService.findById(id);
    return { success: true, data };
  }
}
