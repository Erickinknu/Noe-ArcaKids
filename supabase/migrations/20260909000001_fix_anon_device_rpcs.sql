-- Fix the anon/authenticated RPC split for the child device (ARCA KIDS).
--
-- The child app runs as "anon" (no login). Audited against live ACLs:
--   1) get_app_categories was authenticated-only            -> child got a silent denial.
--   2) check_geofences / get_child_achievements / increment_achievement /
--      get_study_mode_schedule leaked through the PUBLIC default grant with NO
--      authorization guard -> any anon could read or mutate another child's data.
--   3) get_device_state / dismiss_device_alert / update_device_location were
--      granted to anon with NO guard -> anon could read/mutate any child.
--
-- Fix: *_for_device variants scoped by the linked device_uuid with a
-- DEVICE_NOT_LINKED guard (same trust model as get_child_rules_for_device),
-- granted to anon. The unguarded p_child_id variants become authenticated-only
-- and are hardened with a parent-of-that-child guard. PUBLIC default execute is
-- revoked everywhere so anon can only reach the device-scoped API.

-- ── 1) Device state heartbeat, device-scoped ──────────────────────────────
create or replace function public.get_device_state_for_device(p_device_uuid text)
returns table (
  is_blocked boolean,
  alert_active boolean,
  alert_started_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  update public.devices set last_seen_at = now() where id = v_device.id;
  return query select v_device.is_blocked, v_device.alert_active, v_device.alert_started_at;
end;
$$;
revoke execute on function public.get_device_state_for_device(text) from public;
grant execute on function public.get_device_state_for_device(text) to anon, authenticated;

-- ── 2) Location reporting, device-scoped ──────────────────────────────────
create or replace function public.update_device_location_for_device(
  p_device_uuid text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
     or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'INVALID_COORDINATES';
  end if;
  update public.devices
  set latitude = p_latitude,
      longitude = p_longitude,
      location_updated_at = now(),
      last_seen_at = now()
  where id = v_device.id;
end;
$$;
revoke execute on function public.update_device_location_for_device(text, double precision, double precision) from public;
grant execute on function public.update_device_location_for_device(text, double precision, double precision) to anon, authenticated;

-- ── 3) Alert dismiss, device-scoped ───────────────────────────────────────
create or replace function public.dismiss_device_alert_for_device(p_device_uuid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  update public.devices
  set alert_active = false,
      alert_started_at = null
  where id = v_device.id;
end;
$$;
revoke execute on function public.dismiss_device_alert_for_device(text) from public;
grant execute on function public.dismiss_device_alert_for_device(text) to anon, authenticated;

-- ── 4) App categories, device-scoped (previously unreachable by the child) ─
create or replace function public.get_app_categories_for_device(p_device_uuid text)
returns table (
  id uuid,
  package_name text,
  app_label text,
  category text,
  time_limit_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  update public.devices set last_seen_at = now() where id = v_device.id;
  return query
    select a.id, a.package_name, a.app_label, a.category, a.time_limit_minutes
    from public.app_categories a
    where a.child_id = v_device.child_id
    order by a.category, a.app_label;
end;
$$;
revoke execute on function public.get_app_categories_for_device(text) from public;
grant execute on function public.get_app_categories_for_device(text) to anon, authenticated;

-- ── 5) Geofence check, device-scoped ──────────────────────────────────────
create or replace function public.check_geofences_for_device(
  p_device_uuid text,
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  geofence_id uuid,
  child_id uuid,
  type text,
  event_time timestamptz,
  latitude double precision,
  longitude double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_geofence record;
  v_distance double precision;
  v_inside boolean;
  v_event_type text;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  for v_geofence in
    select id, child_id, latitude, longitude, radius
    from public.geofences
    where child_id = v_device.child_id
      and enabled = true
  loop
    v_distance := public.haversine_distance(
      p_latitude, p_longitude,
      v_geofence.latitude, v_geofence.longitude
    );
    v_inside := v_distance <= v_geofence.radius;
    v_event_type := case when v_inside then 'enter' else 'exit' end;
    return query select
      v_geofence.id,
      v_geofence.child_id,
      v_event_type,
      now() as event_time,
      p_latitude,
      p_longitude;
  end loop;
end;
$$;
revoke execute on function public.check_geofences_for_device(text, double precision, double precision) from public;
grant execute on function public.check_geofences_for_device(text, double precision, double precision) to anon, authenticated;

-- ── 6) Achievements, device-scoped ────────────────────────────────────────
create or replace function public.get_child_achievements_for_device(p_device_uuid text)
returns table (
  achievement_id uuid,
  key text,
  title text,
  description text,
  icon text,
  target_value integer,
  achievement_type text,
  current_value integer,
  achieved boolean,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;
  return query
    select
      a.id as achievement_id,
      a.key,
      a.title,
      a.description,
      a.icon,
      a.target_value,
      a.achievement_type,
      coalesce(ca.current_value, 0) as current_value,
      coalesce(ca.achieved, false) as achieved,
      ca.achieved_at
    from public.achievements a
    left join public.child_achievements ca
      on ca.achievement_id = a.id and ca.child_id = v_device.child_id
    order by a.key;
end;
$$;
revoke execute on function public.get_child_achievements_for_device(text) from public;
grant execute on function public.get_child_achievements_for_device(text) to anon, authenticated;

create or replace function public.increment_achievement_for_device(
  p_device_uuid text,
  p_achievement_key text,
  p_increment integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_achievement_id uuid;
  v_target integer;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  select id, target_value into v_achievement_id, v_target
  from public.achievements where key = p_achievement_key;

  if v_achievement_id is null then
    return;
  end if;

  insert into public.child_achievements (child_id, achievement_id, current_value, achieved)
  values (v_device.child_id, v_achievement_id, p_increment, p_increment >= v_target)
  on conflict (child_id, achievement_id)
  do update set
    current_value = public.child_achievements.current_value + p_increment,
    achieved = (public.child_achievements.current_value + p_increment) >= v_target,
    achieved_at = case
      when (public.child_achievements.current_value + p_increment) >= v_target and not public.child_achievements.achieved
      then now()
      else public.child_achievements.achieved_at
    end;
end;
$$;
revoke execute on function public.increment_achievement_for_device(text, text, integer) from public;
grant execute on function public.increment_achievement_for_device(text, text, integer) to anon, authenticated;

-- ── 7) Harden + close the unguarded p_child_id variants ───────────────────
-- Parent-scoped guard used below: p_child_id must belong to the caller's family.
create or replace function public.update_device_location(
  p_child_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
     or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'INVALID_COORDINATES';
  end if;
  update public.devices
  set latitude = p_latitude,
      longitude = p_longitude,
      location_updated_at = now()
  where child_id = p_child_id;
end;
$$;
revoke execute on function public.update_device_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.update_device_location(uuid, double precision, double precision) to authenticated;

create or replace function public.dismiss_device_alert(p_child_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.devices
  set alert_active = false,
      alert_started_at = null
  where child_id = p_child_id;
end;
$$;
revoke execute on function public.dismiss_device_alert(uuid) from public, anon;
grant execute on function public.dismiss_device_alert(uuid) to authenticated;

create or replace function public.get_device_state(p_child_id uuid)
returns table (
  is_blocked boolean,
  alert_active boolean,
  alert_started_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return query
    select d.is_blocked, d.alert_active, d.alert_started_at
    from public.devices d
    where d.child_id = p_child_id
    limit 1;
end;
$$;
revoke execute on function public.get_device_state(uuid) from public, anon;
grant execute on function public.get_device_state(uuid) to authenticated;

create or replace function public.check_geofences(
  p_child_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  geofence_id uuid,
  child_id uuid,
  type text,
  event_time timestamptz,
  latitude double precision,
  longitude double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geofence record;
  v_distance double precision;
  v_inside boolean;
  v_event_type text;
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  for v_geofence in
    select id, child_id, latitude, longitude, radius
    from public.geofences
    where child_id = p_child_id
      and enabled = true
  loop
    v_distance := public.haversine_distance(
      p_latitude, p_longitude,
      v_geofence.latitude, v_geofence.longitude
    );
    v_inside := v_distance <= v_geofence.radius;
    v_event_type := case when v_inside then 'enter' else 'exit' end;
    return query select
      v_geofence.id,
      v_geofence.child_id,
      v_event_type,
      now() as event_time,
      p_latitude,
      p_longitude;
  end loop;
end;
$$;
revoke execute on function public.check_geofences(uuid, double precision, double precision) from public, anon;
grant execute on function public.check_geofences(uuid, double precision, double precision) to authenticated;
revoke execute on function public.haversine_distance(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.haversine_distance(double precision, double precision, double precision, double precision) to authenticated;

create or replace function public.get_child_achievements(p_child_id uuid)
returns table (
  achievement_id uuid,
  key text,
  title text,
  description text,
  icon text,
  target_value integer,
  achievement_type text,
  current_value integer,
  achieved boolean,
  achieved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return query
    select
      a.id as achievement_id,
      a.key,
      a.title,
      a.description,
      a.icon,
      a.target_value,
      a.achievement_type,
      coalesce(ca.current_value, 0) as current_value,
      coalesce(ca.achieved, false) as achieved,
      ca.achieved_at
    from public.achievements a
    left join public.child_achievements ca
      on ca.achievement_id = a.id and ca.child_id = p_child_id
    order by a.key;
end;
$$;
revoke execute on function public.get_child_achievements(uuid) from public, anon;
grant execute on function public.get_child_achievements(uuid) to authenticated;

create or replace function public.increment_achievement(
  p_child_id uuid,
  p_achievement_key text,
  p_increment integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_achievement_id uuid;
  v_target integer;
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select id, target_value into v_achievement_id, v_target
  from public.achievements where key = p_achievement_key;

  if v_achievement_id is null then
    return;
  end if;

  insert into public.child_achievements (child_id, achievement_id, current_value, achieved)
  values (p_child_id, v_achievement_id, p_increment, p_increment >= v_target)
  on conflict (child_id, achievement_id)
  do update set
    current_value = public.child_achievements.current_value + p_increment,
    achieved = (public.child_achievements.current_value + p_increment) >= v_target,
    achieved_at = case
      when (public.child_achievements.current_value + p_increment) >= v_target and not public.child_achievements.achieved
      then now()
      else public.child_achievements.achieved_at
    end;
end;
$$;
revoke execute on function public.increment_achievement(uuid, text, integer) from public, anon;
grant execute on function public.increment_achievement(uuid, text, integer) to authenticated;

-- Close the PUBLIC-default leak on study mode (the child does not read it).
-- Keeps the original jsonb return contract used by NOE.
create or replace function public.get_study_mode_schedule(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.study_mode_schedules%rowtype;
begin
  if not public.is_family_parent((select c.family_id from public.children c where c.id = p_child_id)) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_schedule
  from public.study_mode_schedules s
  where s.child_id = p_child_id;
  if v_schedule.id is null then
    return '{"enabled": false, "blocked_packages": [], "days": [], "hours": []}'::jsonb;
  end if;
  return jsonb_build_object(
    'enabled', v_schedule.enabled,
    'blocked_packages', v_schedule.blocked_packages,
    'days', v_schedule.days,
    'hours', v_schedule.hours
  );
end;
$$;
revoke execute on function public.get_study_mode_schedule(uuid) from public, anon;
grant execute on function public.get_study_mode_schedule(uuid) to authenticated;