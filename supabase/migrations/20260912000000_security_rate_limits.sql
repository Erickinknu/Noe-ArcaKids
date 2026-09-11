-- Server-side rate limiting for anon-reachable RPCs.
--
-- Context (production checklist item #8): the earlier audit only had an
-- in-memory client-side limiter (packages/shared/src/rate-limiter.ts). This
-- migration adds a durable server-side throttle used by the anonymous paths:
--
--   1) redeem_pairing_code — brute-force protection on top of the existing
--      use-once + expiry checks: a code locks for 10 minutes after 10 invalid
--      attempts, and every attempt is throttled per provisioning device_uuid.
--   2) increment_achievement_for_device — scoring abuse protection (anon can
--      mint achievement progress); capped per device + achievement key.
--
-- Per-IP limiting requires an Edge Function (PostgREST does not forward the
-- client IP inside an RPC); see docs/runbook.md.

-- ── Throttle ledger ──────────────────────────────────────────────────────────
create table if not exists public.api_throttle (
  key text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);

-- Generic server-side throttle helper. Raises RATE_LIMITED when the key has
-- seen >= p_max attempts in the current window.
create or replace function public.throttle(p_key text, p_max integer default 60, p_window_seconds integer default 60)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.api_throttle%rowtype;
begin
  select * into v_row from public.api_throttle where key = p_key for update;
  if v_row.key is not null then
    if v_row.window_start <= now() - (p_window_seconds || ' seconds')::interval then
      -- Window expired: reset the bucket.
      update public.api_throttle
      set window_start = now(), attempts = 1
      where key = p_key;
      return;
    end if;
    if v_row.attempts >= p_max then
      raise exception 'RATE_LIMITED' using
        hint = 'Try again later.';
    end if;
    update public.api_throttle
    set attempts = attempts + 1
    where key = p_key;
    return;
  end if;
  insert into public.api_throttle (key, window_start, attempts)
  values (p_key, now(), 1)
  on conflict (key) do nothing;
end;
$$;

revoke execute on function public.throttle(text, integer, integer) from public, anon;
grant execute on function public.throttle(text, integer, integer) to service_role;

-- ── redeem_pairing_code: brute-force lock + attempt throttle ────────────────
alter table public.pairing_codes
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;

create or replace function public.redeem_pairing_code(
  p_code text,
  p_device_uuid uuid,
  p_device_name text default 'ARCA KIDS device',
  p_platform text default 'android'
)
returns table (
  child_id uuid,
  display_name text,
  avatar_url text,
  family_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pairing_codes%rowtype;
begin
  perform public.throttle('pairing:' || p_device_uuid::text, 30, 60);

  select * into v_row
  from public.pairing_codes
  where code = p_code
  for update;

  if v_row.id is null then
    raise exception 'INVALID_CODE';
  end if;

  if v_row.locked_until is not null and v_row.locked_until > now() then
    raise exception 'TOO_MANY_ATTEMPTS' using
      hint = 'This code is temporarily locked. Wait a few minutes and try again.';
  end if;
  if v_row.used_at is not null then
    raise exception 'CODE_ALREADY_USED';
  end if;
  if v_row.expires_at <= now() then
    raise exception 'CODE_EXPIRED';
  end if;

  update public.pairing_codes
  set used_at = now(),
      failed_attempts = 0,
      locked_until = null
  where id = v_row.id;

  insert into public.devices (family_id, child_id, device_uuid, name, platform)
  values (v_row.family_id, v_row.child_id, p_device_uuid, p_device_name, p_platform)
  on conflict (device_uuid) do update
    set child_id = excluded.child_id,
        family_id = excluded.family_id,
        name = excluded.name,
        platform = excluded.platform,
        last_seen_at = now();

  return query
    select c.id, c.display_name, c.avatar_url, c.family_id
    from public.children c
    where c.id = v_row.child_id;
exception
  when others then
    if sqlerrm like 'INVALID_CODE%' or sqlerrm like 'TOO_MANY_ATTEMPTS%' then
      update public.pairing_codes
      set failed_attempts = failed_attempts + 1,
          locked_until = case
            when failed_attempts + 1 >= 10
            then now() + interval '10 minutes'
            else locked_until
          end
      where code = p_code;
    end if;
    raise;
end;
$$;

revoke execute on function public.redeem_pairing_code(text, uuid, text, text) from public, anon;
grant execute on function public.redeem_pairing_code(text, uuid, text, text) to anon, authenticated;

-- ── increment_achievement_for_device: scoring abuse throttle ───────────────
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

  perform public.throttle('achievement:' || p_device_uuid || ':' || p_achievement_key, 60, 60);

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