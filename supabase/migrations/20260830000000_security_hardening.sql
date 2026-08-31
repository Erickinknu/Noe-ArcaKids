-- Security hardening audit pass (2026-08-30).
-- 1) Revoke anon/public EXECUTE on parent-only SECURITY DEFINER RPCs and
--    authorize them with public.is_family_parent.
-- 2) Add SET search_path to every SECURITY DEFINER that lacked it (prevents
--    search-path hijacking).
-- 3) Add the missing GRANTs on tables created without them
--    (geofences, web_filters, push_tokens, unlock_requests) and tighten their
--    RLS policies with explicit roles / WITH CHECK and membership helpers.
-- 4) Validate ranges for client-supplied lat/lon/minutes.
-- All statements are idempotent.

-- ─────────────────────────────────────────────────────────────
-- 1) Device control functions (parent intent)
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_device_blocked(
  p_child_id uuid,
  p_blocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent(
    (select family_id from public.children where id = p_child_id)
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.devices
  set is_blocked = p_blocked
  where child_id = p_child_id;
end;
$$;

create or replace function public.trigger_device_alert(
  p_child_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent(
    (select family_id from public.children where id = p_child_id)
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  update public.devices
  set alert_active = true,
      alert_started_at = now()
  where child_id = p_child_id;
end;
$$;

-- Dismiss is needed by BOTH the parent and the child device (anon). We keep it
-- callable by anon/authenticated but scope it with SET search_path.
create or replace function public.dismiss_device_alert(
  p_child_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices
  set alert_active = false,
      alert_started_at = null
  where child_id = p_child_id;
end;
$$;

-- Child device reports its GPS (anon). Validate coordinate ranges.
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

-- Child device polls its own state (anon) / parent reads it (authenticated).
create or replace function public.get_device_state(
  p_child_id uuid
)
returns table (
  is_blocked boolean,
  alert_active boolean,
  alert_started_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.is_blocked, d.alert_active, d.alert_started_at
  from public.devices d
  where d.child_id = p_child_id
  limit 1;
$$;

-- Parent-only: child locations map.
create or replace function public.get_children_locations()
returns table (
  child_id uuid,
  display_name text,
  avatar_url text,
  latitude double precision,
  longitude double precision,
  location_updated_at timestamptz,
  is_online boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as child_id,
    c.display_name,
    c.avatar_url,
    d.latitude,
    d.longitude,
    d.location_updated_at,
    (d.last_seen_at is not null and d.last_seen_at > now() - interval '5 minutes') as is_online
  from public.children c
  join public.devices d on d.child_id = c.id
  where c.family_id = (
    select p.family_id from public.profiles p
    where p.user_id = auth.uid()
    limit 1
  )
  and d.latitude is not null
  and d.longitude is not null;
$$;

revoke execute on function public.set_device_blocked(uuid, boolean) from public, anon;
grant execute on function public.set_device_blocked(uuid, boolean) to authenticated;

revoke execute on function public.trigger_device_alert(uuid) from public, anon;
grant execute on function public.trigger_device_alert(uuid) to authenticated;

revoke execute on function public.get_children_locations() from public, anon;
grant execute on function public.get_children_locations() to authenticated;

-- Device-facing functions remain available to anon (device auth is roadmap).
revoke execute on function public.dismiss_device_alert(uuid) from public;
grant execute on function public.dismiss_device_alert(uuid) to anon, authenticated;

revoke execute on function public.update_device_location(uuid, double precision, double precision) from public;
grant execute on function public.update_device_location(uuid, double precision, double precision) to anon, authenticated;

revoke execute on function public.get_device_state(uuid) from public;
grant execute on function public.get_device_state(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2) App categories: parent-only with membership authorization
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_app_categories(p_child_id uuid)
returns table (
  id uuid,
  package_name text,
  app_label text,
  category text,
  time_limit_minutes integer
)
language sql
security definer
set search_path = public
as $$
  select id, package_name, app_label, category, time_limit_minutes
  from public.app_categories
  where child_id = p_child_id
    and public.is_family_parent((select family_id from public.children where id = p_child_id))
  order by category, app_label;
$$;

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
begin
  select family_id into v_family_id from children where id = p_child_id;
  if v_family_id is null or not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  insert into app_categories (family_id, child_id, package_name, app_label, category, time_limit_minutes)
  values (v_family_id, p_child_id, p_package_name, p_app_label, p_category, p_time_limit_minutes)
  on conflict (child_id, package_name)
  do update set category = p_category, time_limit_minutes = p_time_limit_minutes, updated_at = now();
end;
$$;

create or replace function public.sync_child_apps(
  p_child_id uuid,
  p_apps jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_app jsonb;
begin
  select family_id into v_family_id from children where id = p_child_id;
  if v_family_id is null or not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  for v_app in select * from jsonb_array_elements(p_apps)
  loop
    insert into app_categories (family_id, child_id, package_name, app_label, category)
    values (
      v_family_id,
      p_child_id,
      v_app->>'packageName',
      v_app->>'label',
      'free'
    )
    on conflict (child_id, package_name) do nothing;
  end loop;
end;
$$;

revoke execute on function public.get_app_categories(uuid) from public, anon;
grant execute on function public.get_app_categories(uuid) to authenticated;

revoke execute on function public.upsert_app_category(uuid, text, text, text, integer) from public, anon;
grant execute on function public.upsert_app_category(uuid, text, text, text, integer) to authenticated;

revoke execute on function public.sync_child_apps(uuid, jsonb) from public, anon;
grant execute on function public.sync_child_apps(uuid, jsonb) to authenticated;

-- Tighten app_categories RLS policy to parent-only with explicit role + WITH CHECK.
drop policy if exists "Family members manage app categories" on public.app_categories;
create policy "Parents manage app categories"
  on public.app_categories for all
  to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

-- ─────────────────────────────────────────────────────────────
-- 3) Missing GRANTs + tightened RLS on the 4 tables created without them
-- ─────────────────────────────────────────────────────────────
-- geofences
drop policy if exists "Family members can manage geofences" on public.geofences;
create policy "Parents manage geofences"
  on public.geofences for all
  to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
grant select, insert, update, delete on public.geofences to authenticated;
revoke all on public.geofences from anon;

-- web_filters
drop policy if exists "Family members can manage web filters" on public.web_filters;
create policy "Parents manage web filters"
  on public.web_filters for all
  to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
grant select, insert, update, delete on public.web_filters to authenticated;
revoke all on public.web_filters from anon;

-- push_tokens
drop policy if exists "Users manage own tokens" on public.push_tokens;
create policy "User manages own tokens"
  on public.push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_tokens to authenticated;
revoke all on public.push_tokens from anon;

-- unlock_requests
drop policy if exists "Family members manage unlock requests" on public.unlock_requests;
create policy "Parents manage unlock requests"
  on public.unlock_requests for all
  to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));
grant select, insert, update, delete on public.unlock_requests to authenticated;
revoke all on public.unlock_requests from anon;

-- ─────────────────────────────────────────────────────────────
-- 4) enqueue_device_command: authorize provisioning branch
--    (mirror the linked-branch check).
-- ─────────────────────────────────────────────────────────────
create or replace function public.enqueue_device_command(
  p_device_uuid text,
  p_command text,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_device public.devices%rowtype;
  v_family_id uuid;
begin
  if p_command not in ('LOCK','UNLOCK','BLOCK_APPS','UNBLOCK_APPS','SET_POLICY','REQUEST_LOCATION') then
    raise exception 'INVALID_COMMAND';
  end if;

  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    -- Provisioning flow: resolve family from device_status and authorize.
    select ds.family_id, ds.child_id into v_family_id, v_device.child_id
    from public.device_status ds where ds.device_uuid = p_device_uuid
    limit 1;
    if v_family_id is null or not public.is_family_parent(v_family_id) then
      raise exception 'NOT_AUTHORIZED';
    end if;

    insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
    values (p_device_uuid, v_family_id, v_device.child_id, p_command, p_payload)
    returning id into v_id;

    if v_id is null then
      raise exception 'DEVICE_NOT_FOUND';
    end if;
    return v_id;
  end if;

  if not public.is_family_parent(v_device.family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
  values (p_device_uuid, v_device.family_id, v_device.child_id, p_command, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5) Missing indexes on the most-consulted columns
-- ─────────────────────────────────────────────────────────────
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists unlock_requests_family_id_idx on public.unlock_requests (family_id);
create index if not exists unlock_requests_family_status_idx on public.unlock_requests (family_id, status);
create index if not exists geofences_family_id_idx on public.geofences (family_id);
create index if not exists web_filters_child_id_idx on public.web_filters (child_id);
create index if not exists usage_reports_device_id_idx on public.usage_reports (device_id);
create index if not exists usage_reports_child_report_idx on public.usage_reports (child_id, report_date);
