import { Controller, Get, Param, Query, Headers } from '@nestjs/common';
import { ContentService } from './content.service';
import { ApiResponse, DailyBundle, MessageCategory, PaginatedResponse, ContentItem, SupportedLocale } from '@the-message/shared';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('daily-bundle')
  async getDailyBundle(
    @Headers('authorization') authHeader: string | undefined,
    @Query('locale') locale: SupportedLocale = 'tr',
    @Query('categories') categoriesParam?: string,
    @Query('date') date?: string,
  ): Promise<ApiResponse<DailyBundle>> {
    const activeCategories = categoriesParam
      ? (categoriesParam.split(',').filter(Boolean) as MessageCategory[])
      : undefined;
    const data = await this.contentService.findDailyBundle(authHeader, locale, activeCategories, date);
    return { success: true, data };
  }

  @Get()
  async getAll(
    @Query('locale') locale: SupportedLocale = 'tr',
    @Query('categories') categoriesParam?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<PaginatedResponse<ContentItem>>> {
    const categories = categoriesParam
      ? (categoriesParam.split(',').filter(Boolean) as MessageCategory[])
      : undefined;
    const data = await this.contentService.findAll(locale, categories, Number(page), Number(limit));
    return { success: true, data };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ApiResponse<ContentItem>> {
    const data = await this.contentService.findById(id);
    return { success: true, data };
  }
}
