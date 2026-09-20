-- P8: caregiver invitations (family_invites) and per-family content mode
-- (general | cristiano | educativo). Parents create invite codes; a second
-- adult redeems them to join the household as a parent. Content mode is
-- read by ARCA KIDS through get_family_mode(device_uuid).

-- Content mode -------------------------------------------------------------
alter table public.families
  add column if not exists mode text not null default 'general'
  check (mode in ('general', 'cristiano', 'educativo'));

-- Caregiver invitations ----------------------------------------------------
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists family_invites_family_id_idx on public.family_invites (family_id);

alter table public.family_invites enable row level security;

create policy "parents can read family invites" on public.family_invites
  for select to authenticated
  using (public.is_family_parent(family_id));

revoke all on table public.family_invites from public, anon;
grant select on table public.family_invites to authenticated;

-- Create invite (parents only, security definer) ---------------------------
create or replace function public.create_family_invite(
  p_family_id uuid,
  p_expires_minutes integer default 4320
)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires timestamptz;
begin
  if not public.is_family_parent(p_family_id) then
    raise exception 'not allowed';
  end if;

  v_expires := now() + make_interval(mins => greatest(60, least(p_expires_minutes, 43200)));

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.family_invites where code = v_code);
  end loop;

  insert into public.family_invites (family_id, code, created_by, expires_at)
  values (p_family_id, v_code, auth.uid(), v_expires);

  return query select v_code, v_expires;
end;
$$;

revoke execute on function public.create_family_invite(uuid, integer) from public, anon;
grant execute on function public.create_family_invite(uuid, integer) to authenticated;

-- Redeem invite (joins the household as parent, security definer) ----------
create or replace function public.redeem_family_invite(p_code text)
returns table (family_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.family_invites%rowtype;
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_invite
  from public.family_invites
  where code = upper(trim(p_code));

  if not found then
    raise exception 'invalid code';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'already used';
  end if;

  if now() > v_invite.expires_at then
    raise exception 'expired';
  end if;

  if exists (
    select 1 from public.profiles
    where user_id = v_uid and family_id = v_invite.family_id
  ) then
    update public.family_invites
    set accepted_by = v_uid, accepted_at = now()
    where id = v_invite.id;
  else
    update public.profiles
    set
      family_id = v_invite.family_id,
      role = 'parent'::public.app_role,
      updated_at = now()
    where user_id = v_uid;

    if not found then
      raise exception 'no profile';
    end if;

    update public.family_invites
    set accepted_by = v_uid, accepted_at = now()
    where id = v_invite.id;
  end if;

  select name into v_name from public.families where id = v_invite.family_id;
  return query select v_name;
end;
$$;

revoke execute on function public.redeem_family_invite(text) from public, anon;
grant execute on function public.redeem_family_invite(text) to authenticated;

-- Expose content mode to the child device (security definer, keyed by device) ---
create or replace function public.get_family_mode(p_device_uuid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select f.mode
  from public.devices d
  join public.families f on f.id = d.family_id
  where d.device_uuid = p_device_uuid
$$;

revoke execute on function public.get_family_mode(uuid) from public;
grant execute on function public.get_family_mode(uuid) to anon, authenticated;

-- Content mode update (already covered by "parents can update own family")
alter policy "parents can update own family" on public.families
  using (public.is_family_parent(id))
  with check (public.is_family_parent(id));