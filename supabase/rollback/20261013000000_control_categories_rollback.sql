-- ROLLBACK de 20261013000000_control_categories.sql (FASE A).
-- USO: solo manual, con OK explícito. NO vive en migrations/ para que ningún
-- `db push` lo aplique solo. Probado en transacción con ROLLBACK (ver reporte).
-- Revierte: datos nuevos->viejos, objetos nuevos fuera, CHECK y RPC originales.
-- NOTA: las filas fusionadas desde blocked_apps vuelven como 'blocked'
-- (blocked_apps nunca se borró, queda intacta). app_categories sin 'free'
-- previo que hubieran cambiado a mano no se distinguen: se mapean por valor.

-- ── 1. Revertir datos ────────────────────────────────────────────────────────
update public.app_categories
set category = 'limited', updated_at = now()
where category = 'tiempo_libre';

update public.app_categories
set category = 'blocked', updated_at = now()
where category = 'no_permitida';

-- ── 2. Quitar objetos nuevos (políticas/trigger/índices caen con la tabla) ───
drop function if exists public.set_category_limit(uuid, text, integer);
drop function if exists public.get_category_limits(uuid);
drop table if exists public.app_category_limits;

-- ── 3. CHECK original ────────────────────────────────────────────────────────
alter table public.app_categories drop constraint if exists app_categories_category_check;
alter table public.app_categories
  add constraint app_categories_category_check
  check (category in ('limited', 'blocked', 'free'));

-- ── 4. RPC dispositivo original (con su guard de identidad) ──────────────────
drop function if exists public.get_child_rules_for_device(uuid);

create function public.get_child_rules_for_device(p_device_uuid uuid)
returns table (
  child_id uuid,
  display_name text,
  daily_limit_minutes int,
  bedtime_enabled boolean,
  bedtime_start time,
  bedtime_end time,
  blocked_packages text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  perform public.assert_device_claim_text(p_device_uuid::text);

  select * into v_device
  from public.devices
  where device_uuid = p_device_uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  update public.devices
  set last_seen_at = now()
  where id = v_device.id;

  return query
    select
      c.id,
      c.display_name,
      r.daily_limit_minutes,
      r.bedtime_enabled,
      r.bedtime_start,
      r.bedtime_end,
      coalesce(
        (select array_agg(b.package_name order by b.package_name)
         from public.blocked_apps b
         where b.child_id = c.id),
        '{}'::text[]
      )
    from public.children c
    left join public.parental_rules r on r.child_id = c.id
    where c.id = v_device.child_id;
end;
$$;

revoke execute on function public.get_child_rules_for_device(uuid) from public, anon;
grant execute on function public.get_child_rules_for_device(uuid) to authenticated;
