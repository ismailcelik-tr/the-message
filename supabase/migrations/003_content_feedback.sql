create table if not exists public.content_feedback (
  id           uuid primary key default gen_random_uuid(),
  content_id   text not null,
  content_type text not null,
  issue_type   text not null check (issue_type in ('wrong_text', 'missing_text', 'wrong_source', 'other')),
  note         text,
  locale       text not null default 'tr',
  user_id      uuid references auth.users (id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at   timestamptz not null default now()
);

alter table public.content_feedback enable row level security;

-- Anyone (including anonymous) can submit feedback
create policy "Anyone can insert feedback"
  on public.content_feedback for select
  using (true);

create policy "Anyone can submit feedback"
  on public.content_feedback for insert
  with check (true);
