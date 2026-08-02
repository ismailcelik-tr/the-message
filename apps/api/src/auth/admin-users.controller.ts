import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApiResponse, NotificationFrequency, PaginatedResponse } from '@the-message/shared';
import ws from 'ws';
import { AdminGuard } from './admin.guard';

interface AdminUserItem {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string;
  role: string;
  locale: string;
  timezone: string;
  platform: string;
  notificationEnabled: boolean;
  preferences: Record<string, any>;
}

const SORTABLE_FIELDS = [
  'createdAt',
  'email',
  'platform',
  'locale',
  'notificationEnabled',
  'frequency',
] as const;

type SortField = (typeof SORTABLE_FIELDS)[number];
type SortDirection = 'asc' | 'desc';

// Supabase caps listUsers at 1000 per page. Sorting has to happen across the whole
// set, so every user is pulled in before slicing — fine at this app's scale, but
// revisit (move sorting into the database) if the user count reaches five figures.
const AUTH_PAGE_SIZE = 1000;
const MAX_USERS = 10000;
const IN_FILTER_CHUNK = 500;

const FREQUENCY_ORDER: Record<NotificationFrequency, number> = { low: 0, medium: 1, high: 2 };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseSortField(value: unknown): SortField {
  return SORTABLE_FIELDS.includes(value as SortField) ? (value as SortField) : 'createdAt';
}

function parseSortDirection(value: unknown): SortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function sortValue(user: AdminUserItem, field: SortField): string | number {
  switch (field) {
    case 'email':
      return user.email.toLowerCase();
    case 'platform':
      return user.platform.toLowerCase();
    case 'locale':
      return user.locale.toLowerCase();
    case 'notificationEnabled':
      return user.notificationEnabled ? 1 : 0;
    case 'frequency': {
      const frequency = user.preferences?.notificationFrequency as NotificationFrequency | undefined;
      // Users with no stored frequency sort after the three known values.
      return frequency && frequency in FREQUENCY_ORDER ? FREQUENCY_ORDER[frequency] : 3;
    }
    case 'createdAt':
    default:
      return new Date(user.createdAt).getTime();
  }
}

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
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ): Promise<ApiResponse<PaginatedResponse<AdminUserItem>>> {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const sortField = parseSortField(sortBy);
    const sortDirection = parseSortDirection(sortDir);

    const users = await this.listAllAuthUsers();

    if (users.length === 0) {
      return {
        success: true,
        data: { items: [], total: 0, page: pageNum, limit: limitNum },
      };
    }

    const userIds = users.map((user) => user.id);
    const [profilesMap, tokensMap] = await Promise.all([
      this.loadProfiles(userIds),
      this.loadLatestTokens(userIds),
    ]);

    const items: AdminUserItem[] = users.map((user) => {
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
        notificationEnabled:
          token?.notification_enabled ?? profile?.preferences?.notificationEnabled ?? false,
        preferences: profile?.preferences ?? {},
      };
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      const left = sortValue(a, sortField);
      const right = sortValue(b, sortField);
      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      // Keep paging stable when the sorted values tie.
      return a.id.localeCompare(b.id);
    });

    const offset = (pageNum - 1) * limitNum;

    return {
      success: true,
      data: {
        items: items.slice(offset, offset + limitNum),
        total: items.length,
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

  private async listAllAuthUsers() {
    const all: any[] = [];

    for (let authPage = 1; all.length < MAX_USERS; authPage += 1) {
      const { data, error } = await this.db.auth.admin.listUsers({
        page: authPage,
        perPage: AUTH_PAGE_SIZE,
      });

      if (error) throw error;

      all.push(...data.users);
      if (data.users.length < AUTH_PAGE_SIZE) break;
    }

    return all;
  }

  private async loadProfiles(userIds: string[]) {
    const profilesMap = new Map<string, any>();

    for (const ids of chunk(userIds, IN_FILTER_CHUNK)) {
      const { data, error } = await this.db
        .from('profiles')
        .select('id, role, preferences')
        .in('id', ids);

      if (error) throw error;
      for (const profile of data ?? []) profilesMap.set(profile.id, profile);
    }

    return profilesMap;
  }

  private async loadLatestTokens(userIds: string[]) {
    const tokensMap = new Map<string, any>();

    for (const ids of chunk(userIds, IN_FILTER_CHUNK)) {
      const { data, error } = await this.db
        .from('push_tokens')
        .select('user_id, platform, timezone, locale, notification_enabled, last_seen_at')
        .in('user_id', ids);

      if (error) throw error;

      // Keep only the most recently active token per user.
      for (const token of data ?? []) {
        const existing = tokensMap.get(token.user_id);
        if (!existing || new Date(token.last_seen_at) > new Date(existing.last_seen_at)) {
          tokensMap.set(token.user_id, token);
        }
      }
    }

    return tokensMap;
  }
}
