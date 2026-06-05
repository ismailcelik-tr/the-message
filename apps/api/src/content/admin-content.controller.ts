import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ContentItem, MessageCategory, PaginatedResponse } from '@the-message/shared';
import { ContentService } from './content.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/content')
@UseGuards(AdminGuard)
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  async getAll(
    @Query('category') category?: MessageCategory,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<ApiResponse<PaginatedResponse<ContentItem & { isActive: boolean }>>> {
    const data = await this.contentService.findAllAdmin(
      category,
      type,
      Number(page),
      Number(limit),
      search,
      isActive === undefined ? undefined : isActive === 'true',
    );
    return { success: true, data };
  }

  @Get('duplicates')
  async getDuplicates(): Promise<ApiResponse<any[]>> {
    const data = await this.contentService.findDuplicatesAdmin();
    return { success: true, data };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ApiResponse<ContentItem & { isActive: boolean }>> {
    const data = await this.contentService.findByIdAdmin(id);
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() body: {
      type: string;
      category: MessageCategory;
      recommendedTime: string;
      date?: string;
      translations: any;
      audioUrl?: string;
      imageUrl?: string;
    },
  ): Promise<ApiResponse<ContentItem & { isActive: boolean }>> {
    const data = await this.contentService.createContent(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      type?: string;
      category?: MessageCategory;
      recommendedTime?: string;
      date?: string;
      translations?: any;
      audioUrl?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<ApiResponse<ContentItem & { isActive: boolean }>> {
    const data = await this.contentService.updateContent(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.contentService.deleteContent(id);
    return { success: true, data: null };
  }
}
