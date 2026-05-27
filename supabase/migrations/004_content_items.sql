create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  category text not null,
  recommended_time text not null default 'any',
  date date,
  translations jsonb not null,
  audio_url text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for common query patterns
create index if not exists idx_content_items_type_active on public.content_items (type, is_active);
create index if not exists idx_content_items_date on public.content_items (date);

-- RLS: public read, no direct write from client (API uses service_role)
alter table public.content_items enable row level security;

create policy "Anyone can read active content"
  on public.content_items for select
  using (is_active = true);
