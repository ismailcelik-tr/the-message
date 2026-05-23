-- profiles tablosu: her kullanıcı için tercihler (JSONB)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- updated_at otomatik güncellensin
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- RLS aç
alter table public.profiles enable row level security;

-- Her kullanıcı yalnızca kendi satırını okuyup yazabilir
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can upsert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
