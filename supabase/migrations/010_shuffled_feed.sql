-- Create an RPC function to retrieve paginated content with a random seed and type exclusion/inclusion
create or replace function public.get_shuffled_content(
  p_seed text,
  p_exclude_types text[] default null,
  p_categories text[] default null,
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
  order by md5(id::text || p_seed)
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

-- We also need a way to get the total count for pagination when using the RPC
create or replace function public.get_shuffled_content_count(
  p_exclude_types text[] default null,
  p_categories text[] default null
) returns int as $$
declare
  total int;
begin
  select count(*) into total
  from public.content_items
  where is_active = true
    and (p_exclude_types is null or type = any(p_exclude_types) = false)
    and (p_categories is null or category = any(p_categories));
  
  return total;
end;
$$ language plpgsql stable;
