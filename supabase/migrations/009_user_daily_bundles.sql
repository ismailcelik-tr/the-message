create table if not exists public.user_daily_bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  locale text not null default 'tr' check (locale in ('tr', 'en')),
  esma_id uuid not null references public.content_items (id) on delete cascade,
  verse_id uuid not null references public.content_items (id) on delete cascade,
  hadith_id uuid not null references public.content_items (id) on delete cascade,
  prayer_id uuid not null references public.content_items (id) on delete cascade,
  worship_id uuid not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_daily_bundles_user_date_unique unique (user_id, date)
);

alter table public.user_daily_bundles enable row level security;

create index if not exists user_daily_bundles_lookup_idx on public.user_daily_bundles (user_id, date);

create policy "Users can read own daily bundles"
  on public.user_daily_bundles for select
  using (auth.uid() = user_id);
