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
    authHeader: string | undefined,
    locale: SupportedLocale = 'tr',
    activeCategories?: MessageCategory[],
    date?: string,
  ): Promise<DailyBundle> {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await this.db.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (userId) {
      const { data: existingBundle } = await this.db
        .from('user_daily_bundles')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .eq('locale', locale)
        .maybeSingle();

      if (existingBundle) {
        const { data: items } = await this.db
          .from('content_items')
          .select('*')
          .in('id', [
            existingBundle.esma_id,
            existingBundle.verse_id,
            existingBundle.hadith_id,
            existingBundle.prayer_id,
            existingBundle.worship_id,
          ]);

        if (items && items.length === 5) {
          const map = new Map(items.map((i) => [i.id, this.toContentItem(i)]));
          return {
            esma: map.get(existingBundle.esma_id)!,
            verse: map.get(existingBundle.verse_id)!,
            hadith: map.get(existingBundle.hadith_id)!,
            prayer: map.get(existingBundle.prayer_id)!,
            worship: map.get(existingBundle.worship_id)!,
          };
        }
      }
    }

    const pick = async (type: string, ignoreCategories = false): Promise<ContentItem> => {
      const { data, error } = await this.db
        .from('content_items')
        .select('*')
        .eq('type', type)
        .eq('is_active', true);

      if (error || !data?.length) throw new NotFoundException(`No active ${type} content found`);

      let items = data;
      if (!ignoreCategories && activeCategories && activeCategories.length > 0) {
        const filtered = items.filter((item) => activeCategories.includes(item.category));
        if (filtered.length > 0) items = filtered;
      }

      const seed = Math.floor(new Date(targetDate).getTime() / 86400000);
      let hash = 0;
      if (userId) {
        for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        hash = Math.abs(hash);
      }

      return this.toContentItem(items[(seed + hash) % items.length]);
    };

    const [esma, verse, hadith, prayer, worship] = await Promise.all([
      pick('esma', true),
      pick('verse'),
      pick('hadith'),
      pick('prayer'),
      pick('worship'),
    ]);

    const bundle = { esma, verse, hadith, prayer, worship };

    if (userId) {
      await this.db.from('user_daily_bundles').upsert({
        user_id: userId,
        date: targetDate,
        locale,
        esma_id: esma.id,
        verse_id: verse.id,
        hadith_id: hadith.id,
        prayer_id: prayer.id,
        worship_id: worship.id,
      }, { onConflict: 'user_id,date' });
    }

    return bundle;
  }

  async findAll(
    _locale: SupportedLocale = 'tr',
    categories?: MessageCategory[],
    excludeTypes?: string[],
    seed?: string,
    type?: string,
    page = 1,
    limit = 20,
    mood?: string,
  ): Promise<PaginatedResponse<ContentItem>> {
    const offset = (page - 1) * limit;

    if (seed) {
      // Use RPC for seeded shuffled pagination
      const { data, error } = await this.db.rpc('get_shuffled_content', {
        p_seed: seed,
        p_exclude_types: excludeTypes?.length ? excludeTypes : null,
        p_categories: categories?.length ? categories : null,
        p_mood: mood || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw new Error(error.message);

      const { data: countData, error: countError } = await this.db.rpc('get_shuffled_content_count', {
        p_exclude_types: excludeTypes?.length ? excludeTypes : null,
        p_categories: categories?.length ? categories : null,
        p_mood: mood || null,
      });

      if (countError) throw new Error(countError.message);

      return {
        items: (data ?? []).map((e: any) => this.toContentItem(e)),
        total: countData ?? 0,
        page,
        limit,
      };
    }

    let query = this.db
      .from('content_items')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (categories && categories.length > 0) {
      query = query.in('category', categories);
    }
    if (excludeTypes && excludeTypes.length > 0) {
      query = query.not('type', 'in', `(${excludeTypes.join(',')})`);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (mood) {
      query = query.contains('moods', [mood]);
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
      moods: (row.moods as string[]) ?? [],
    };
  }

  async findAllAdmin(
    category?: MessageCategory,
    type?: string,
    page = 1,
    limit = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<ContentItem & { isActive: boolean }>> {
    let query = this.db
      .from('content_items')
      .select('*', { count: 'exact' });

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search?.trim()) {
      const q = search.trim();
      query = query.or(`translations->tr->>content.ilike.%${q}%,translations->en->>content.ilike.%${q}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

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
    moods?: string[];
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
        moods: item.moods || [],
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
      moods?: string[];
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
    if (item.moods !== undefined) updateData.moods = item.moods;

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

  async findDuplicatesAdmin(): Promise<any[]> {
    const { data, error } = await this.db.rpc('get_duplicate_content');
    if (error) throw new Error(error.message);
    return data ?? [];
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
      moods: (row.moods as string[]) ?? [],
    };
  }
}
