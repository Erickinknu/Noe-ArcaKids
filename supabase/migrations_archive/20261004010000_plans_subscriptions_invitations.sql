-- Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('free','basic','premium')),
  name text not null,
  price_cents int not null default 0,
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month','year')),
  max_children int not null default 1,
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

insert into public.plans (slug,name,price_cents,currency,interval,max_children,max_tutors,max_devices,features,sort_order)
values
  ('free','Gratis',0,'usd','month',1,1,2,'{"web_filtering":true,"schedules":true,"geofences":true,"device_status":true,"notifications":true,"study_mode":true,"max_children":1,"max_tutors":1}',0),
  ('basic','Básico',499,'usd','month',2,2,3,'{"web_filtering":true,"schedules":true,"geofences":true,"device_status":true,"notifications":true,"study_mode":true,"unlock_requests":true,"activity_reports":true,"max_children":2,"max_tutors":2}',1),
  ('premium','Premium',999,'usd','month',5,5,5,'{"web_filtering":true,"schedules":true,"geofences":true,"device_status":true,"notifications":true,"study_mode":true,"unlock_requests":true,"activity_reports":true,"location":true,"priority_support":true,"max_children":5,"max_tutors":5}',2)
on conflict (slug) do update set
  name=excluded.name,
  price_cents=excluded.price_cents,
  currency=excluded.currency,
  interval=excluded.interval,
  max_children=excluded.max_children,
  max_tutors=excluded.max_tutors,
  max_devices=excluded.max_devices,
  features=excluded.features,
  sort_order=excluded.sort_order,
  is_active=true,
  updated_at=now();

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  plan_id uuid references public.plans(id) on delete restrict not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired','paused','expired')),
  provider text not null default 'stripe' check (provider in ('stripe','manual')),
  provider_sub_id text,
  provider_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, provider, provider_sub_id)
);

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