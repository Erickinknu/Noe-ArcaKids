-- Family invitations + helpers
create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  code text not null unique,
  role text not null default 'parent' check (role in ('parent','guardian')),
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null not null,
  revoked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (used_count <= max_uses),
  check (used_at is null or used_count >= 1)
);

create index if not exists family_invitations_family_id_idx on public.family_invitations(family_id);
create index if not exists family_invitations_code_idx on public.family_invitations(code);
create index if not exists family_invitations_expires_at_idx on public.family_invitations(expires_at);

alter table public.family_invitations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='family_invitations' and policyname='invitations_family_parents_read') then
    create policy invitations_family_parents_read on public.family_invitations for select using (public.is_family_parent(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='family_invitations' and policyname='invitations_family_parents_write') then
    create policy invitations_family_parents_write on public.family_invitations for insert with check (public.is_family_parent(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='family_invitations' and policyname='invitations_family_parents_update') then
    create policy invitations_family_parents_update on public.family_invitations for update using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='family_invitations' and policyname='invitations_family_parents_delete') then
    create policy invitations_family_parents_delete on public.family_invitations for delete using (public.is_family_parent(family_id));
  end if;
end $$;

drop trigger if exists trg_family_invitations_updated_at on public.family_invitations;
create trigger trg_family_invitations_updated_at before update on public.family_invitations
  for each row execute function public.update_plans_updated_at();

create or replace function public.generate_family_invitation(_family_id uuid, _expires_in_hours int default 24, _max_uses int default 1)
returns table (id uuid, code text, expires_at timestamptz, max_uses int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
  v_exp timestamptz;
  attempts int := 0;
begin
  if not public.is_family_parent(_family_id) then
    raise exception 'not authorized';
  end if;
  v_exp := now() + (_expires_in_hours || ' hours')::interval;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    v_code := regexp_replace(v_code, '[^A-Z0-9]', '', 'g');
    if length(v_code) < 6 then
      v_code := upper(encode(gen_random_bytes(4), 'hex'));
    end if;
    v_code := substr(v_code, 1, 8);
    begin
      insert into public.family_invitations (family_id, code, role, max_uses, expires_at, created_by)
      values (_family_id, v_code, 'parent', greatest(1,_max_uses), v_exp, auth.uid())
      returning id into v_id;
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 10 then raise; end if;
    end;
  end loop;
  return query select v_id, v_code, v_exp, greatest(1,_max_uses);
end;
$$;

revoke all on function public.generate_family_invitation(uuid,int,int) from public;
grant execute on function public.generate_family_invitation(uuid,int,int) to authenticated;

create or replace function public.accept_family_invitation(_code text)
returns table (family_id uuid, family_name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  uid uuid := auth.uid();
  fam_id uuid;
  fam_name text;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  select * into inv from public.family_invitations
    where upper(code)=upper(_code) and revoked_at is null;
  if not found then raise exception 'invalid_code'; end if;
  if inv.expires_at < now() then raise exception 'invitation_expired'; end if;
  if inv.used_count >= inv.max_uses then raise exception 'invitation_used'; end if;
  if exists (select 1 from public.family_members fm where fm.family_id=inv.family_id and fm.user_id=uid) then
    raise exception 'already_member';
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (inv.family_id, uid, inv.role)
  on conflict do nothing;
  update public.family_invitations
    set used_count = used_count + 1,
        used_at = now(),
        used_by = uid,
        updated_at = now()
    where id = inv.id;
  select f.id, f.name into fam_id, fam_name from public.families f where f.id=inv.family_id;
  return query select fam_id, fam_name, inv.role;
end;
$$;

revoke all on function public.accept_family_invitation(text) from public;
grant execute on function public.accept_family_invitation(text) to authenticated;

create or replace function public.get_family_plan_limits(_family_id uuid)
returns table (
  slug text,
  max_children int,
  max_tutors int,
  max_devices int,
  features jsonb,
  status text,
  current_period_end timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.slug, p.max_children, p.max_tutors, p.max_devices, p.features, s.status, s.current_period_end
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.family_id = _family_id
  order by s.created_at desc
  limit 1;
$$;

revoke all on function public.get_family_plan_limits(uuid) from public;
grant execute on function public.get_family_plan_limits(uuid) to authenticated;

create or replace function public.can_add_child(_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (
    coalesce((select l.max_children from public.get_family_plan_limits(_family_id) l), 1) >
    coalesce((select count(*) from public.children c where c.family_id = _family_id), 0)
  );
$$;

revoke all on function public.can_add_child(uuid) from public;
grant execute on function public.can_add_child(uuid) to authenticated;

create or replace function public.can_invite_tutor(_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select (
    coalesce((select l.max_tutors from public.get_family_plan_limits(_family_id) l), 1) >
    coalesce((select count(*) from public.family_members fm where fm.family_id = _family_id), 0)
  );
$$;

revoke all on function public.can_invite_tutor(uuid) from public;
grant execute on function public.can_invite_tutor(uuid) to authenticated;