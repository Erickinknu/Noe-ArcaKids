-- P9: share the family PIN (set in NOE) with child devices so ARCA KIDS can
-- protect sensitive actions. The parent app writes a salted SHA-256 hash of the
-- PIN onto the device rows of its family; ARCA KIDS fetches it keyed by its own
-- device_uuid (anon, security definer) and verifies locally (cached offline).
-- Trade-off: the hash is exposed to anyone who knows a 128-bit device uuid;
-- same trust level as the other anon device RPCs (get_family_mode, etc.).

alter table public.devices
  add column if not exists pin_salt text,
  add column if not exists pin_hash text;

-- Parent writes the PIN hash to one of its family's devices ------------------
create or replace function public.set_family_device_pin(
  p_device_uuid uuid,
  p_salt text,
  p_pin_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select family_id into v_family_id
  from public.devices
  where device_uuid = p_device_uuid;

  if v_family_id is null then
    raise exception 'device not found';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'not allowed';
  end if;

  update public.devices
  set pin_salt = p_salt, pin_hash = p_pin_hash
  where device_uuid = p_device_uuid;
end;
$$;

revoke execute on function public.set_family_device_pin(uuid, text, text) from public, anon;
grant execute on function public.set_family_device_pin(uuid, text, text) to authenticated;

create or replace function public.clear_family_device_pin(p_device_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select family_id into v_family_id
  from public.devices
  where device_uuid = p_device_uuid;

  if v_family_id is null then
    raise exception 'device not found';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'not allowed';
  end if;

  update public.devices
  set pin_salt = null, pin_hash = null
  where device_uuid = p_device_uuid;
end;
$$;

revoke execute on function public.clear_family_device_pin(uuid) from public, anon;
grant execute on function public.clear_family_device_pin(uuid) to authenticated;

-- Child device reads the PIN hash (security definer, keyed by own device) -----
create or replace function public.get_family_device_pin(p_device_uuid uuid)
returns table (salt text, pin_hash text)
language sql
stable
security definer
set search_path = public
as $$
  select d.pin_salt, d.pin_hash
  from public.devices d
  where d.device_uuid = p_device_uuid
$$;

revoke execute on function public.get_family_device_pin(uuid) from public;
grant execute on function public.get_family_device_pin(uuid) to anon, authenticated;