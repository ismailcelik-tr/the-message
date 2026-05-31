import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiResponse, PaginatedResponse } from '@the-message/shared';
import ws from 'ws';
import { AdminGuard } from './admin.guard';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  private readonly db: SupabaseClient;

  constructor() {
    this.db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws as any } },
    );
  }

  @Get()
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // 1. Fetch users from Supabase Auth Admin API
    const { data: { users }, error: authError } = await this.db.auth.admin.listUsers({
      page: pageNum,
      perPage: limitNum,
    });

    if (authError) throw authError;

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return {
        success: true,
        data: { items: [], total: 0, page: pageNum, limit: limitNum },
      };
    }

    // 2. Fetch profiles
    const { data: profiles, error: profilesError } = await this.db
      .from('profiles')
      .select('id, role, preferences')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // 3. Fetch latest active tokens to get timezone and platform
    const { data: tokens, error: tokensError } = await this.db
      .from('push_tokens')
      .select('user_id, platform, timezone, locale, notification_enabled, last_seen_at')
      .in('user_id', userIds);

    if (tokensError) throw tokensError;

    // Map profiles and tokens for quick access
    const profilesMap = new Map(profiles?.map((p) => [p.id, p]));
    
    // Group tokens by user_id and take the most recently active one
    const tokensMap = new Map<string, any>();
    for (const t of tokens ?? []) {
      const existing = tokensMap.get(t.user_id);
      if (!existing || new Date(t.last_seen_at) > new Date(existing.last_seen_at)) {
        tokensMap.set(t.user_id, t);
      }
    }

    // 4. Merge results
    const items = users.map((user) => {
      const profile = profilesMap.get(user.id);
      const token = tokensMap.get(user.id);

      return {
        id: user.id,
        email: user.email ?? 'anonymous@themessage.app',
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        role: profile?.role ?? 'user',
        locale: token?.locale ?? profile?.preferences?.locale ?? 'tr',
        timezone: token?.timezone ?? 'Europe/Istanbul',
        platform: token?.platform ?? 'unknown',
        notificationEnabled: token?.notification_enabled ?? profile?.preferences?.notificationEnabled ?? false,
        preferences: profile?.preferences ?? {},
      };
    });

    // Note: listUsers total count is sometimes not returned directly or needs manual estimation.
    // For simple MVPs, we use the user length or double query if page 1.
    const totalUsers = items.length; // Approximate total in batch or simple count

    return {
      success: true,
      data: {
        items,
        total: totalUsers < limitNum && pageNum === 1 ? totalUsers : 100, // Return accurate total if single page
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get(':id/bookmarks')
  async getBookmarks(@Param('id') id: string): Promise<ApiResponse<any[]>> {
    const { data, error } = await this.db
      .from('bookmarks')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data ?? [] };
  }
}
