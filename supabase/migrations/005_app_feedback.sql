create table if not exists public.app_feedback (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  email      text,
  user_id    uuid references auth.users (id) on delete set null,
  locale     text not null default 'tr',
  created_at timestamptz not null default now()
);

alter table public.app_feedback enable row level security;

create policy "Anyone can submit app feedback"
  on public.app_feedback for insert
  with check (true);
