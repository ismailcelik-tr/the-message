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
}
