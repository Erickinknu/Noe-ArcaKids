-- Phase 4B: child-device access to parental rules and usage reporting.
-- The child app runs unauthenticated (anon); these SECURITY DEFINER RPCs are
-- the only path, scoped by the linked device_uuid (same trust model as redeem).

create or replace function public.get_child_rules_for_device(p_device_uuid uuid)
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

create or replace function public.report_usage_for_device(
  p_device_uuid uuid,
  p_report_date date,
  p_entries jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_entry jsonb;
  v_package text;
  v_minutes int;
begin
  select * into v_device
  from public.devices
  where device_uuid = p_device_uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  update public.devices
  set last_seen_at = now()
  where id = v_device.id;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    v_package := v_entry ->> 'package';
    v_minutes := coalesce((v_entry ->> 'minutes')::int, 0);

    if v_package is null or length(v_package) = 0 or v_minutes < 0 then
      continue;
    end if;

    insert into public.usage_reports (family_id, child_id, device_id, report_date, package_name, minutes)
    values (v_device.family_id, v_device.child_id, v_device.id, p_report_date, v_package, v_minutes)
    on conflict (child_id, report_date, package_name) do update
      set minutes = excluded.minutes,
          device_id = excluded.device_id,
          updated_at = now();
  end loop;
end;
$$;

revoke execute on function public.get_child_rules_for_device(uuid) from public;
grant execute on function public.get_child_rules_for_device(uuid) to anon, authenticated;

revoke execute on function public.report_usage_for_device(uuid, date, jsonb) from public;
grant execute on function public.report_usage_for_device(uuid, date, jsonb) to anon, authenticated;
