-- 1. Add moods column to content_items if it does not exist
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS moods text[] DEFAULT '{}';

-- 2. Re-create RPC function get_shuffled_content with p_mood filter
create or replace function public.get_shuffled_content(
  p_seed text,
  p_exclude_types text[] default null,
  p_categories text[] default null,
  p_mood text default null,
  p_limit int default 20,
  p_offset int default 0
) returns setof public.content_items as $$
begin
  return query
  select *
  from public.content_items
  where is_active = true
    and (p_exclude_types is null or type = any(p_exclude_types) = false)
    and (p_categories is null or category = any(p_categories))
    and (p_mood is null or p_mood = any(moods))
  order by md5(id::text || p_seed)
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

-- 3. Re-create RPC function get_shuffled_content_count with p_mood filter
create or replace function public.get_shuffled_content_count(
  p_exclude_types text[] default null,
  p_categories text[] default null,
  p_mood text default null
) returns int as $$
declare
  total int;
begin
  select count(*) into total
  from public.content_items
  where is_active = true
    and (p_exclude_types is null or type = any(p_exclude_types) = false)
    and (p_categories is null or category = any(p_categories))
    and (p_mood is null or p_mood = any(moods));
  
  return total;
end;
$$ language plpgsql stable;
