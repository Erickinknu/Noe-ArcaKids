-- Compatibilidad app instalada (1.4.7 escribe 'limited'/'blocked' en
-- upsert_app_category y el CHECK nuevo los rechazaría). Mapea valores viejos
-- a nuevos; resto intacto (guard is_family_parent + grants).
create or replace function public.upsert_app_category(
  p_child_id uuid,
  p_package_name text,
  p_app_label text,
  p_category text,
  p_time_limit_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_category text;
begin
  v_category := case p_category
    when 'limited' then 'tiempo_libre'
    when 'blocked' then 'no_permitida'
    else p_category
  end;
  if v_category not in ('free', 'tiempo_libre', 'siempre', 'no_permitida') then
    raise exception 'INVALID_CATEGORY';
  end if;
  select family_id into v_family_id from children where id = p_child_id;
  if v_family_id is null or not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  insert into app_categories (family_id, child_id, package_name, app_label, category, time_limit_minutes)
  values (v_family_id, p_child_id, p_package_name, p_app_label, v_category, p_time_limit_minutes)
  on conflict (child_id, package_name)
  do update set category = v_category, time_limit_minutes = p_time_limit_minutes, updated_at = now();
end;
$$;

revoke execute on function public.upsert_app_category(uuid, text, text, text, integer) from public, anon;
grant execute on function public.upsert_app_category(uuid, text, text, text, integer) to authenticated;
