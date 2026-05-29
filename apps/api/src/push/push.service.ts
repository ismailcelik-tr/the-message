import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  PushAudienceCount,
  PushAudienceFilters,
  PushCampaign,
  PushCampaignRequest,
  PushCampaignStatus,
  RegisterPushTokenRequest,
  UpdatePushPreferencesRequest,
} from '@the-message/shared';
import ws from 'ws';

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

  constructor() {
    this.db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { realtime: { transport: ws as never } },
    );
  }

  assertAdmin(authHeader?: string, secretHeader?: string): void {
    const configuredSecret = process.env.ADMIN_PUSH_SECRET;
    if (!configuredSecret) {
      throw new UnauthorizedException('ADMIN_PUSH_SECRET is not configured');
    }

    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    if (secretHeader !== configuredSecret && bearer !== configuredSecret) {
      throw new UnauthorizedException('Invalid admin push secret');
    }
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
}
