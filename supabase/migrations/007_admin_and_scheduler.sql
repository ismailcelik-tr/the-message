-- Alter profiles table to add role
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Alter push_tokens table to add timezone
alter table public.push_tokens
  add column if not exists timezone text not null default 'Europe/Istanbul';

-- Create push_logs table to prevent duplicate sends and track history
create table if not exists public.push_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  slot text not null,
  content_id uuid not null references public.content_items (id) on delete cascade,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  constraint push_logs_user_date_slot_unique unique (user_id, date, slot)
);

-- Enable RLS on push_logs
alter table public.push_logs enable row level security;

-- Indexing for quick check by scheduler
create index if not exists push_logs_lookup_idx on public.push_logs (user_id, date, slot);

-- Policies for push_logs
create policy "Users can read own push logs"
  on public.push_logs for select
  using (auth.uid() = user_id);

create policy "Admins can read all push logs"
  on public.push_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
