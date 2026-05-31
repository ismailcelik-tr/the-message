-- 1. Create duplicate content checker RPC function
CREATE OR REPLACE FUNCTION public.get_duplicate_content()
RETURNS TABLE (
  content_text text,
  ids uuid[],
  count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    translations->'tr'->>'content' AS content_text,
    array_agg(id) AS ids,
    count(*) AS count
  FROM public.content_items
  GROUP BY translations->'tr'->>'content'
  HAVING count(*) > 1;
END;
$$;

-- 2. Clean up exact duplicate records based on Turkish content and type (keeping the oldest entry)
DELETE FROM public.content_items a
USING public.content_items b
WHERE a.id > b.id
  AND a.type = b.type
  AND a.translations->'tr'->>'content' = b.translations->'tr'->>'content';

-- 3. Clean up specific corrupted/joined quotes and prayers from seed errors
DELETE FROM public.content_items
WHERE type = 'prayer'
  AND (
    translations->'tr'->>'content' LIKE '%Ataullah İskenderî%' OR
    translations->'tr'->>'content' LIKE '%Necip Fazıl%' OR
    translations->'tr'->>'content' LIKE '%Hasan Âli Yücel%' OR
    translations->'tr'->>'content' LIKE '%Kaygusuz Abdal%' OR
    translations->'tr'->>'content' LIKE 'Ey Allah’ım! Senin rahmetini umuyorum, beni göz açıp kapayıncaya kadar'
  );
