-- Reconciliación: plans + subscriptions + family_invitations + realtime devices.
-- Contexto (docs/diagnostico-divergencia.md): el remoto nunca recibió
-- 20261004010000/20261004010010 y su `subscriptions` es user-céntrica
-- (id, user_id, product_id, plan, status, ...). Esta migración la lleva al
-- modelo familia-céntrico SIN borrar filas ni romper los RPC antiguos
-- (claim_subscription/get_my_subscription siguen viendo sus columnas).
-- Los archivos originales quedan archivados en supabase/migrations_archive/
-- y NO deben aplicarse jamás (el seed sobrescribiría slugs/precios).

-- §1 plans (no existe en remoto) -------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('free','family','family_annual')),
  name text not null,
  price_cents int not null default 0,
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month','year')),
  max_children int,
  max_tutors int not null default 1,
  max_devices int not null default 2,
  features jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plans' and policyname='plans_read_all') then
    create policy plans_read_all on public.plans for select using (true);
  end if;
end $$;

create or replace function public.update_plans_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at before update on public.plans
  for each row execute function public.update_plans_updated_at();

-- Seed alineado al catálogo de la app. DO NOTHING para no pisar datos.
insert into public.plans (slug,name,price_cents,currency,interval,max_children,max_tutors,max_devices,features,sort_order)
values
  ('free','Gratis',0,'usd','month',1,1,2,'{"max_children":1,"max_tutors":1}',0),
  ('family','Familiar',499,'usd','month',null,3,5,'{"max_tutors":3}',1),
  ('family_annual','Familiar Anual',3999,'usd','year',null,5,5,'{"max_tutors":5}',2)
on conflict (slug) do nothing;

-- §2 subscriptions: reconciliar forma user-céntrica → familia-céntrica -----
alter table public.subscriptions add column if not exists family_id uuid;
alter table public.subscriptions add column if not exists plan_id uuid;
alter table public.subscriptions add column if not exists provider_sub_id text;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists canceled_at timestamptz;
alter table public.subscriptions add column if not exists trial_end timestamptz;
alter table public.subscriptions add column if not exists metadata jsonb not null default '{}';
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();

-- Backfill: familia por perfil del usuario; plan por slug (= texto legacy).
update public.subscriptions s
  set family_id = pr.family_id
  from public.profiles pr
  where pr.user_id = s.user_id and s.family_id is null;

update public.subscriptions s
  set plan_id = p.id
  from public.plans p
  where p.slug = s.plan and s.plan_id is null;

do $$
declare
  v_unmapped int;
begin
  select count(*) into v_unmapped
    from public.subscriptions where family_id is null or plan_id is null;
  if v_unmapped = 0 then
    alter table public.subscriptions alter column family_id set not null;
    alter table public.subscriptions alter column plan_id set not null;
  else
    raise notice 'reconcile: % subscriptions sin mapear (NOT NULL omitido)', v_unmapped;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='subscriptions_family_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_family_id_fkey
      foreign key (family_id) references public.families(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='subscriptions_plan_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_plan_id_fkey
      foreign key (plan_id) references public.plans(id) on delete restrict;
  end if;
end $$;

create index if not exists subscriptions_family_id_idx on public.subscriptions(family_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_provider_sub_id_idx on public.subscriptions(provider_sub_id);

alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_family_members_read') then
    create policy subscriptions_family_members_read on public.subscriptions for select using (public.is_family_member(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_family_parents_write') then
    create policy subscriptions_family_parents_write on public.subscriptions for insert with check (public.is_family_parent(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_family_parents_update') then
    create policy subscriptions_family_parents_update on public.subscriptions for update using (public.is_family_parent(family_id)) with check (public.is_family_parent(family_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='subscriptions_family_parents_delete') then
    create policy subscriptions_family_parents_delete on public.subscriptions for delete using (public.is_family_parent(family_id));
  end if;
end $$;

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_plans_updated_at();

create or replace function public.ensure_family_subscription()
returns trigger as $$
declare
  free_plan_id uuid;
begin
  select id into free_plan_id from public.plans where slug='free' limit 1;
  if free_plan_id is not null and not exists (
    select 1 from public.subscriptions s where s.family_id = new.id
  ) then
    insert into public.subscriptions (family_id, plan_id, status, provider)
    values (new.id, free_plan_id, 'active', 'manual');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_families_ensure_subscription on public.families;
create trigger trg_families_ensure_subscription after insert on public.families
  for each row execute function public.ensure_family_subscription();

-- §3 family_invitations (tabla nueva; funciones ADAPTADAS al modelo real) ---
-- Diferencias vs archivo original archivado:
--  * accept/can_invite_tutor usan profiles (no existe family_members).
--  * profiles tiene UNIQUE(user_id): un tutor solo puede estar en UNA
--    familia (limitación conocida; multi-familia requiere cambio de modelo).
--  * app_role solo tiene parent/child: el invitado entra como parent.
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
  fam_name text;
  existing_family uuid;
  v_email text;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  select * into inv from public.family_invitations
    where upper(code)=upper(_code) and revoked_at is null;
  if not found then raise exception 'invalid_code'; end if;
  if inv.expires_at < now() then raise exception 'invitation_expired'; end if;
  if inv.used_count >= inv.max_uses then raise exception 'invitation_used'; end if;
  select p.family_id into existing_family from public.profiles p where p.user_id = uid;
  if existing_family is not null then
    if existing_family = inv.family_id then raise exception 'already_member'; end if;
    raise exception 'already_member_other_family';
  end if;
  select u.email into v_email from auth.users u where u.id = uid;
  insert into public.profiles (family_id, user_id, email, display_name, role)
  values (inv.family_id, uid, v_email, coalesce(split_part(v_email,'@',1), 'Tutor'), 'parent'::public.app_role);
  update public.family_invitations
    set used_count = used_count + 1,
        used_at = now(),
        used_by = uid,
        updated_at = now()
    where id = inv.id;
  select f.name into fam_name from public.families f where f.id = inv.family_id;
  return query select inv.family_id, fam_name, 'parent'::text;
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
    coalesce((select count(*) from public.profiles p where p.family_id = _family_id and p.role = 'parent'::public.app_role), 0)
  );
$$;

revoke all on function public.can_invite_tutor(uuid) from public;
grant execute on function public.can_invite_tutor(uuid) to authenticated;

-- §4 realtime: ubicaciones en vivo hacia padres ------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;
