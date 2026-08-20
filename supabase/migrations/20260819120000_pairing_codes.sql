-- Phase 3: device linking via short pairing codes redeemed by the child app.
-- anon has NO table grants; the redeem RPC (SECURITY DEFINER) is the only path.

create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pairing_codes enable row level security;

create index pairing_codes_code_idx on public.pairing_codes (code);
create index pairing_codes_family_id_idx on public.pairing_codes (family_id);

-- Parents manage their own codes; members may read them for auditing.
create policy "parents can manage own pairing codes" on public.pairing_codes
  for all to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

grant select, insert, update, delete on public.pairing_codes to authenticated;

-- Redeem: validate code (not used, not expired), upsert the device, mark used.
-- Executed by anon/authenticated; SECURITY DEFINER bypasses table RLS on purpose.
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
  select * into v_row
  from public.pairing_codes
  where code = p_code
  for update;

  if v_row.id is null then
    raise exception 'INVALID_CODE';
  end if;
  if v_row.used_at is not null then
    raise exception 'CODE_ALREADY_USED';
  end if;
  if v_row.expires_at <= now() then
    raise exception 'CODE_EXPIRED';
  end if;

  update public.pairing_codes
  set used_at = now()
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
end;
$$;

revoke execute on function public.redeem_pairing_code(text, uuid, text, text) from public, anon;
grant execute on function public.redeem_pairing_code(text, uuid, text, text) to anon, authenticated;