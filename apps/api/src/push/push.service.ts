import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PushAudienceCount,
  PushAudienceFilters,
  PushCampaign,
  PushCampaignRequest,
  PushCampaignStatus,
  RegisterPushTokenRequest,
  UpdatePushPreferencesRequest,
  SupportedLocale,
} from '@the-message/shared';
import ws from 'ws';
import { ContentService } from '../content/content.service';

interface PushTokenRow {
  user_id: string;
  expo_push_token: string;
}

interface PushCampaignRow {
  id: string;
  title: string;
  body: string;
  filters: PushAudienceFilters;
  status: PushCampaignStatus;
  scheduled_for: string | null;
  target_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoPushResponse {
  data?: ExpoTicket[];
  errors?: Array<{ message?: string; code?: string }>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

@Injectable()
export class PushService {
  private readonly db: SupabaseClient;

  constructor(private readonly contentService: ContentService) {
    this.db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws as never } },
    );
  }

  async registerToken(authHeader: string | undefined, body: RegisterPushTokenRequest): Promise<void> {
    const user = await this.getUser(authHeader);
    this.validateToken(body.token);

    const { error } = await this.db
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        email: user.email ?? null,
        expo_push_token: body.token,
        platform: body.platform,
        locale: body.locale,
        notification_enabled: body.notificationEnabled,
        timezone: body.timezone ?? 'Europe/Istanbul',
        is_active: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'expo_push_token' });

    if (error) throw new BadRequestException(error.message);
  }

  async updatePreferences(authHeader: string | undefined, body: UpdatePushPreferencesRequest): Promise<void> {
    const user = await this.getUser(authHeader);
    const { error } = await this.db
      .from('push_tokens')
      .update({ notification_enabled: body.notificationEnabled })
      .eq('user_id', user.id);

    if (error) throw new BadRequestException(error.message);
  }

  async countAudience(filters: PushAudienceFilters): Promise<PushAudienceCount> {
    const tokens = await this.findAudienceTokens(filters);
    return {
      tokens: tokens.length,
      users: new Set(tokens.map((token) => token.user_id)).size,
    };
  }

  async createCampaign(body: PushCampaignRequest): Promise<PushCampaign> {
    this.validateCampaign(body);
    const audience = await this.countAudience(body.filters);

    const { data, error } = await this.db
      .from('push_campaigns')
      .insert({
        title: body.title.trim(),
        body: body.body.trim(),
        filters: body.filters,
        status: 'scheduled',
        scheduled_for: body.scheduledFor ?? null,
        target_count: audience.tokens,
      })
      .select('*')
      .single();

    if (error || !data) throw new BadRequestException(error?.message ?? 'Campaign could not be created');
    return this.toCampaign(data as PushCampaignRow);
  }

  async sendCampaign(id: string): Promise<PushCampaign> {
    const campaign = await this.getCampaignRow(id);
    const tokens = await this.findAudienceTokens(campaign.filters);

    await this.updateCampaign(id, {
      status: 'sending',
      target_count: tokens.length,
      sent_count: 0,
      failed_count: 0,
      tickets: [],
      errors: [],
    });

    const tickets: ExpoTicket[] = [];
    const errors: Array<Record<string, unknown>> = [];
    const staleExpoTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const result = await this.sendExpoBatch(batch.map((token) => token.expo_push_token), campaign);
      const batchTickets = result.data ?? [];
      batchTickets.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const token = batch[index]?.expo_push_token;
          if (token) staleExpoTokens.push(token);
        }
      });
      tickets.push(...batchTickets);
      if (result.errors) errors.push(...result.errors);
    }

    const failedTickets = tickets.filter((ticket) => ticket.status === 'error');
    const sentCount = tickets.filter((ticket) => ticket.status === 'ok').length;
    const failedCount = failedTickets.length + errors.length;
    const status: PushCampaignStatus = failedCount === 0 ? 'sent' : sentCount > 0 ? 'partial' : 'failed';

    const updated = await this.updateCampaign(id, {
      status,
      target_count: tokens.length,
      sent_count: sentCount,
      failed_count: failedCount,
      tickets,
      errors,
      sent_at: new Date().toISOString(),
    });

    await this.deactivateUnregisteredTokens(staleExpoTokens);
    return updated;
  }

  async processDueCampaigns(): Promise<PushCampaign[]> {
    const { data, error } = await this.db
      .from('push_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (error) throw new BadRequestException(error.message);

    const sent: PushCampaign[] = [];
    for (const campaign of (data ?? []) as PushCampaignRow[]) {
      sent.push(await this.sendCampaign(campaign.id));
    }
    return sent;
  }

  async listCampaigns(): Promise<PushCampaign[]> {
    const { data, error } = await this.db
      .from('push_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException(error.message);
    return ((data ?? []) as PushCampaignRow[]).map((row) => this.toCampaign(row));
  }

  private async getUser(authHeader?: string): Promise<User> {
    if (!authHeader) throw new UnauthorizedException('Authorization header required');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await this.db.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }

  private validateToken(token: string): void {
    if (!token || (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken['))) {
      throw new BadRequestException('Invalid Expo push token');
    }
  }

  private validateCampaign(body: PushCampaignRequest): void {
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (!body.body?.trim()) throw new BadRequestException('Body is required');
    if (!body.filters) throw new BadRequestException('Filters are required');
    if (body.scheduledFor && Number.isNaN(new Date(body.scheduledFor).getTime())) {
      throw new BadRequestException('scheduledFor must be an ISO date');
    }
  }

  private async getCampaignRow(id: string): Promise<PushCampaignRow> {
    const { data, error } = await this.db
      .from('push_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new BadRequestException(error?.message ?? 'Campaign not found');
    return data as PushCampaignRow;
  }

  private async updateCampaign(id: string, update: Record<string, unknown>): Promise<PushCampaign> {
    const { data, error } = await this.db
      .from('push_campaigns')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw new BadRequestException(error?.message ?? 'Campaign could not be updated');
    return this.toCampaign(data as PushCampaignRow);
  }

  private async findAudienceTokens(filters: PushAudienceFilters): Promise<PushTokenRow[]> {
    const rows: PushTokenRow[] = [];
    let from = 0;

    while (true) {
      let query = this.db
        .from('push_tokens')
        .select('user_id, expo_push_token')
        .eq('is_active', true)
        .range(from, from + 999);

      if (filters.enabledOnly) query = query.eq('notification_enabled', true);
      if (filters.locale) query = query.eq('locale', filters.locale);
      if (filters.platform) query = query.eq('platform', filters.platform);
      if (filters.email?.trim()) query = query.ilike('email', filters.email.trim());

      const { data, error } = await query;
      if (error) throw new BadRequestException(error.message);

      const page = (data ?? []) as PushTokenRow[];
      rows.push(...page);
      if (page.length < 1000) break;
      from += 1000;
    }

    return rows;
  }

  private async sendExpoBatch(tokens: string[], campaign: PushCampaignRow): Promise<ExpoPushResponse> {
    if (tokens.length === 0) return { data: [] };

    const headers: Record<string, string> = {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
    };

    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(tokens.map((token) => ({
        to: token,
        title: campaign.title,
        body: campaign.body,
        sound: 'default',
        data: { campaignId: campaign.id },
      }))),
    });

    const json = await response.json() as ExpoPushResponse;
    if (!response.ok) {
      return {
        data: [],
        errors: [{ message: `Expo Push API error: ${response.status}`, code: String(response.status), ...json }],
      };
    }
    return json;
  }

  private async deactivateUnregisteredTokens(staleTokens: string[]): Promise<void> {
    if (staleTokens.length === 0) return;

    await this.db
      .from('push_tokens')
      .update({ is_active: false })
      .in('expo_push_token', staleTokens);
  }

  private toCampaign(row: PushCampaignRow): PushCampaign {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      filters: row.filters,
      status: row.status,
      scheduledFor: row.scheduled_for ?? undefined,
      targetCount: row.target_count,
      sentCount: row.sent_count,
      failedCount: row.failed_count,
      createdAt: row.created_at,
      sentAt: row.sent_at ?? undefined,
    };
  }

  private async pickUniqueContentForUser(
    userId: string,
    type: string,
    categories: string[],
    dateStr: string,
  ): Promise<any | null> {
    // 1. Fetch all active content items of this type
    const { data: allItems, error: itemsError } = await this.db
      .from('content_items')
      .select('*')
      .eq('type', type)
      .eq('is_active', true);

    if (itemsError || !allItems || allItems.length === 0) {
      return null;
    }

    // 2. Filter by user category preferences if any
    let filtered = allItems;
    if (categories && categories.length > 0) {
      filtered = allItems.filter((item) => categories.includes(item.category));
      if (filtered.length === 0) {
        filtered = allItems; // Fallback
      }
    }

    // 3. Fetch user's sent content logs in the last 7 days (or sent today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sentLogs, error: logsError } = await this.db
      .from('push_logs')
      .select('content_id')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    const sentContentIds = new Set((sentLogs ?? []).map((log) => log.content_id));

    // 4. Filter out sent items
    let remaining = filtered.filter((item) => !sentContentIds.has(item.id));

    // 5. If no items left, fallback to all filtered items (no duplicate prevention)
    if (remaining.length === 0) {
      remaining = filtered;
    }

    // 6. Deterministically pick an item using a seed based on user_id + dateStr
    const seed = dateStr
      ? Math.floor(new Date(dateStr).getTime() / 86400000)
      : Math.floor(Date.now() / 86400000);
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const index = (seed + hash) % remaining.length;
    return remaining[index];
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDailyPushScheduler(): Promise<void> {
    const now = new Date();
    // 1. Get all active push tokens
    const tokens = await this.findActivePushTokens();
    if (tokens.length === 0) return;

    // 2. Fetch profiles for these tokens to check user preferences
    const userIds = Array.from(new Set(tokens.map((t) => t.user_id)));
    const profilesMap = await this.fetchProfilesMap(userIds);

    const dueNotifications: Array<{
      token: string;
      title: string;
      body: string;
      userId: string;
      dateStr: string;
      slot: string;
      contentId: string;
    }> = [];

    for (const token of tokens) {
      const profile = profilesMap.get(token.user_id);
      if (!profile || !profile.notificationEnabled) continue;

      // Calculate local time & date for the user based on their timezone
      const localTimeStr = this.getLocalTime(now, token.timezone); // e.g. "07:00"
      const userDateStr = this.getUserLocalDate(now, token.timezone); // e.g. "2026-05-31"

      const slots = profile.notificationSchedule?.[profile.notificationFrequency] || [];
      for (const slot of slots) {
        if (slot.time === localTimeStr) {
          // Check silent hours
          if (this.isInSilentWindow(localTimeStr, profile.silentHours)) {
            continue;
          }

          // Check if already sent for this slot today
          const alreadySent = await this.checkIfAlreadySent(token.user_id, userDateStr, slot.label);
          if (alreadySent) {
            continue;
          }

          // Retrieve daily bundle content for this slot
          try {
            const categories = Object.keys(profile.categoryPreferences).filter(
              (key) => profile.categoryPreferences[key as keyof typeof profile.categoryPreferences],
            ) as any[];

            // Determine appropriate content type based on the slot label
            const slotTypeMap: Record<string, string> = {
              morning: 'verse',
              midMorning: 'esma',
              noon: 'hadith',
              afternoon: 'esma',
              evening: 'prayer',
            };
            const type = slotTypeMap[slot.label] || 'verse';

            // Pick a unique content item not sent in the last 7 days
            const contentItem = await this.pickUniqueContentForUser(token.user_id, type, categories, userDateStr);
            if (!contentItem) continue;

            const localePref = (token.locale as SupportedLocale) || 'tr';
            const tr = contentItem.translations[localePref] ?? contentItem.translations['tr'];
            const slotLabelTR: Record<string, string> = {
              morning: 'Sabah',
              midMorning: 'Kuşluk',
              noon: 'Öğle',
              afternoon: 'İkindi',
              evening: 'Akşam',
            };
            const slotLabelEN: Record<string, string> = {
              morning: 'Morning',
              midMorning: 'Mid-Morning',
              noon: 'Noon',
              afternoon: 'Afternoon',
              evening: 'Evening',
            };
            const label = token.locale === 'tr'
              ? (slotLabelTR[slot.label] ?? slot.label)
              : (slotLabelEN[slot.label] ?? slot.label);

            const title = token.locale === 'tr' ? `${label} — Çağrı` : `${label} — The Message`;
            const rawContent = tr.content;
            const source = tr.source;
            const full = source ? `${rawContent} — ${source}` : rawContent;
            const body = full.length > 180 ? full.slice(0, 177) + '…' : full;

            // Acquire atomic lock to prevent multiple deployed containers from sending duplicates
            const hasLock = await this.acquirePushLock(token.user_id, userDateStr, slot.label, contentItem.id);
            if (!hasLock) {
              continue;
            }

            dueNotifications.push({
              token: token.expo_push_token,
              title,
              body,
              userId: token.user_id,
              dateStr: userDateStr,
              slot: slot.label,
              contentId: contentItem.id,
            });
          } catch (error) {
            console.error(`Error resolving content for user ${token.user_id}:`, error);
          }
        }
      }
    }

    if (dueNotifications.length === 0) return;

    // Dispatch notifications in batches
    for (let i = 0; i < dueNotifications.length; i += BATCH_SIZE) {
      const batch = dueNotifications.slice(i, i + BATCH_SIZE);
      const tickets = await this.sendDailyExpoBatch(batch);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const ticket = tickets[j];
        const success = ticket && ticket.status === 'ok';

        await this.logPushSent(
          item!.userId,
          item!.dateStr,
          item!.slot,
          item!.contentId,
          success ? 'success' : 'failed',
          ticket?.message,
        );

        if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await this.deactivateUnregisteredTokens([item!.token]);
        }
      }
    }
  }

  private async findActivePushTokens(): Promise<any[]> {
    const { data, error } = await this.db
      .from('push_tokens')
      .select('*')
      .eq('is_active', true)
      .eq('notification_enabled', true);

    if (error) {
      console.error('Error fetching active push tokens:', error);
      return [];
    }
    return data ?? [];
  }

  private async fetchProfilesMap(userIds: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (userIds.length === 0) return map;

    const { data, error } = await this.db
      .from('profiles')
      .select('id, preferences')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching user profiles:', error);
      return map;
    }

    for (const row of data ?? []) {
      map.set(row.id, row.preferences);
    }
    return map;
  }

  private getLocalTime(date: Date, timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return formatter.format(date);
    } catch {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return formatter.format(date);
    }
  }

  private getUserLocalDate(date: Date, timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date); // YYYY-MM-DD
    } catch {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    }
  }

  private isInSilentWindow(timeHHMM: string, silent: any): boolean {
    if (!silent || !silent.enabled) return false;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };

    const t = toMinutes(timeHHMM);
    const start = toMinutes(silent.start);
    const end = toMinutes(silent.end);

    if (start > end) {
      return t >= start || t < end;
    }
    return t >= start && t < end;
  }

  private async checkIfAlreadySent(userId: string, date: string, slot: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('push_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('slot', slot)
      .maybeSingle();

    if (error) {
      console.error('Error checking push logs:', error);
      return true; // Avoid duplicates in case of db check errors
    }
    return !!data;
  }

  private async acquirePushLock(
    userId: string,
    date: string,
    slot: string,
    contentId: string,
  ): Promise<boolean> {
    const { error } = await this.db
      .from('push_logs')
      .insert({
        user_id: userId,
        date,
        slot,
        content_id: contentId,
        status: 'failed',
        error_message: 'sending',
      });

    if (error) {
      // If insertion fails (e.g. unique constraint violation), lock is not acquired.
      return false;
    }
    return true;
  }

  private async logPushSent(
    userId: string,
    date: string,
    slot: string,
    contentId: string,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('push_logs')
      .update({
        status,
        error_message: errorMessage || null,
      })
      .eq('user_id', userId)
      .eq('date', date)
      .eq('slot', slot);

    if (error) {
      console.error('Error logging push sent:', error);
    }
  }

  private async sendDailyExpoBatch(batch: any[]): Promise<ExpoTicket[]> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
    };

    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          batch.map((item) => ({
            to: item.token,
            title: item.title,
            body: item.body,
            sound: 'default',
            data: { contentId: item.contentId },
          })),
        ),
      });

      const json = (await response.json()) as ExpoPushResponse;
      if (!response.ok) {
        return batch.map(() => ({ status: 'error', message: `HTTP Error ${response.status}` }));
      }
      return json.data ?? batch.map(() => ({ status: 'error', message: 'No ticket returned' }));
    } catch (err: any) {
      return batch.map(() => ({ status: 'error', message: err.message }));
    }
  }
}
