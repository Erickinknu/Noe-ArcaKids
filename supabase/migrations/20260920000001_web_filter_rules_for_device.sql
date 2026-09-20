-- Parte B3: Internet Seguro -> filtrado de dominios por VPN.
-- ARCA KIDS (VpnFilterService) necesita saber qué categorías del filtrado web
-- tiene habilitadas la familia del niño para bloquear a nivel de dominio.
-- El dispositivo se identifica por device_uuid (igual que usage_reports y
-- web_visits); la resolución device -> child -> family valida el acceso.

create or replace function public.get_web_filter_rules_for_device(
  p_device_uuid uuid
)
returns table (
  child_id uuid,
  category text,
  enabled boolean,
  blocked_sites text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
begin
  select d.child_id into v_child_id
  from public.devices d
  where d.device_uuid = p_device_uuid
    and d.child_id is not null
  limit 1;

  if v_child_id is null then
    return;
  end if;

  return query
    select f.child_id, f.category, f.enabled, coalesce(f.blocked_sites, '{}'::text[])
    from public.web_filters f
    where f.child_id = v_child_id
    order by f.category;
end;
$$;

revoke execute on function public.get_web_filter_rules_for_device(uuid) from public, anon;
grant execute on function public.get_web_filter_rules_for_device(uuid) to anon, authenticated;