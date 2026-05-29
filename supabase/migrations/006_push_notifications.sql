create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  locale text not null default 'tr' check (locale in ('tr', 'en')),
  notification_enabled boolean not null default true,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute procedure public.set_updated_at();

alter table public.push_tokens enable row level security;

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists push_tokens_audience_idx on public.push_tokens (is_active, notification_enabled, locale, platform);
create index if not exists push_tokens_email_idx on public.push_tokens (lower(email));

create table if not exists public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  filters jsonb not null default '{}',
  status text not null default 'scheduled' check (status in ('scheduled', 'sending', 'sent', 'failed', 'partial')),
  scheduled_for timestamptz,
  timezone text not null default 'Europe/Istanbul',
  target_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  tickets jsonb not null default '[]',
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create trigger push_campaigns_updated_at
  before update on public.push_campaigns
  for each row execute procedure public.set_updated_at();

alter table public.push_campaigns enable row level security;

create index if not exists push_campaigns_status_schedule_idx on public.push_campaigns (status, scheduled_for);
