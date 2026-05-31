import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ContentItem, DailyBundle, MessageCategory, SupportedLocale, PaginatedResponse } from '@the-message/shared';
import ws from 'ws';

@Injectable()
export class ContentService {
  private readonly db: SupabaseClient;

  constructor() {
    this.db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws as any } },
    );
  }

  async findDailyBundle(
    _locale: SupportedLocale = 'tr',
    activeCategories?: MessageCategory[],
    date?: string,
  ): Promise<DailyBundle> {
    // Absolute day number since Unix epoch — unique per calendar day, stable across years
    const seed = date
      ? Math.floor(new Date(date).getTime() / 86400000)
      : Math.floor(Date.now() / 86400000);

    const pick = async (type: string): Promise<ContentItem> => {
      const { data, error } = await this.db
        .from('content_items')
        .select('*')
        .eq('type', type)
        .eq('is_active', true);

      if (error || !data?.length) throw new NotFoundException(`No active ${type} content found`);

      let items = data;
      if (activeCategories && activeCategories.length > 0) {
        const filtered = items.filter((item) => activeCategories.includes(item.category));
        if (filtered.length > 0) items = filtered;
      }

      return this.toContentItem(items[seed % items.length]);
    };

    const [esma, verse, hadith, prayer, worship] = await Promise.all([
      pick('esma'),
      pick('verse'),
      pick('hadith'),
      pick('prayer'),
      pick('worship'),
    ]);

    return { esma, verse, hadith, prayer, worship };
  }

  async findAll(
    _locale: SupportedLocale = 'tr',
    category?: MessageCategory,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ContentItem>> {
    let query = this.db
      .from('content_items')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      items: (data ?? []).map((e) => this.toContentItem(e)),
      total: count ?? 0,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<ContentItem> {
    const { data, error } = await this.db
      .from('content_items')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException(`Content ${id} not found`);
    return this.toContentItem(data);
  }

  private toContentItem(row: Record<string, unknown>): ContentItem {
    return {
      id: row.id as string,
      type: row.type as ContentItem['type'],
      category: row.category as MessageCategory,
      recommendedTime: (row.recommended_time ?? 'any') as ContentItem['recommendedTime'],
      date: (row.date as string) ?? new Date().toISOString().split('T')[0],
      translations: row.translations as ContentItem['translations'],
      audioUrl: (row.audio_url as string) ?? undefined,
      imageUrl: (row.image_url as string) ?? undefined,
    };
  }

  async findAllAdmin(
    category?: MessageCategory,
    type?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ContentItem & { isActive: boolean }>> {
    let query = this.db
      .from('content_items')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('category', category);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      items: (data ?? []).map((e) => this.toContentItemAdmin(e)),
      total: count ?? 0,
      page,
      limit,
    };
  }

  async findByIdAdmin(id: string): Promise<ContentItem & { isActive: boolean }> {
    const { data, error } = await this.db
      .from('content_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Content ${id} not found`);
    return this.toContentItemAdmin(data);
  }

  async createContent(item: {
    type: string;
    category: MessageCategory;
    recommendedTime: string;
    date?: string;
    translations: any;
    audioUrl?: string;
    imageUrl?: string;
  }): Promise<ContentItem & { isActive: boolean }> {
    const { data, error } = await this.db
      .from('content_items')
      .insert({
        type: item.type,
        category: item.category,
        recommended_time: item.recommendedTime,
        date: item.date || null,
        translations: item.translations,
        audio_url: item.audioUrl || null,
        image_url: item.imageUrl || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Content could not be created');
    }
    return this.toContentItemAdmin(data);
  }

  async updateContent(
    id: string,
    item: {
      type?: string;
      category?: MessageCategory;
      recommendedTime?: string;
      date?: string;
      translations?: any;
      audioUrl?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<ContentItem & { isActive: boolean }> {
    const updateData: Record<string, any> = {};
    if (item.type !== undefined) updateData.type = item.type;
    if (item.category !== undefined) updateData.category = item.category;
    if (item.recommendedTime !== undefined) updateData.recommended_time = item.recommendedTime;
    if (item.date !== undefined) updateData.date = item.date || null;
    if (item.translations !== undefined) updateData.translations = item.translations;
    if (item.audioUrl !== undefined) updateData.audio_url = item.audioUrl || null;
    if (item.imageUrl !== undefined) updateData.image_url = item.imageUrl || null;
    if (item.isActive !== undefined) updateData.is_active = item.isActive;

    const { data, error } = await this.db
      .from('content_items')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Content could not be updated');
    }
    return this.toContentItemAdmin(data);
  }

  async deleteContent(id: string): Promise<void> {
    const { error } = await this.db
      .from('content_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private toContentItemAdmin(row: Record<string, any>): ContentItem & { isActive: boolean } {
    return {
      id: row.id as string,
      type: row.type as ContentItem['type'],
      category: row.category as MessageCategory,
      recommendedTime: (row.recommended_time ?? 'any') as ContentItem['recommendedTime'],
      date: (row.date as string) ?? new Date().toISOString().split('T')[0],
      translations: row.translations as ContentItem['translations'],
      audioUrl: (row.audio_url as string) ?? undefined,
      imageUrl: (row.image_url as string) ?? undefined,
      isActive: row.is_active as boolean,
    };
  }
}
