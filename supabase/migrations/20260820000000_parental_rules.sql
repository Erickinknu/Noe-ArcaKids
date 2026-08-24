-- Phase 4A: parental control rules, blocked apps, usage schedules and usage reports.
-- Parents manage rules; family members read. Child-device writes arrive via RPCs in phase 4B.

create table public.parental_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null unique references public.children(id) on delete cascade,
  daily_limit_minutes int check (daily_limit_minutes is null or daily_limit_minutes between 0 and 1440),
  bedtime_enabled boolean not null default false,
  bedtime_start time,
  bedtime_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    bedtime_enabled = false
    or (bedtime_start is not null and bedtime_end is not null)
  )
);

create table public.blocked_apps (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  package_name text not null,
  app_label text not null,
  created_at timestamptz not null default now(),
  unique (child_id, package_name)
);

create table public.usage_schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  kind text not null default 'allowed' check (kind in ('allowed', 'study')),
  created_at timestamptz not null default now()
);

create table public.usage_reports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  report_date date not null,
  package_name text not null,
  minutes int not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, report_date, package_name)
);

create index parental_rules_family_id_idx on public.parental_rules (family_id);
create index blocked_apps_family_id_idx on public.blocked_apps (family_id);
create index blocked_apps_child_id_idx on public.blocked_apps (child_id);
create index usage_schedules_child_id_idx on public.usage_schedules (child_id);
create index usage_reports_child_id_date_idx on public.usage_reports (child_id, report_date);

create trigger parental_rules_set_updated_at
  before update on public.parental_rules
  for each row execute function public.set_updated_at();

create trigger usage_reports_set_updated_at
  before update on public.usage_reports
  for each row execute function public.set_updated_at();

alter table public.parental_rules enable row level security;
alter table public.blocked_apps enable row level security;
alter table public.usage_schedules enable row level security;
alter table public.usage_reports enable row level security;

-- Members read; parents manage (same split as children/devices).
create policy "members can read parental rules" on public.parental_rules
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "parents can insert parental rules" on public.parental_rules
  for insert to authenticated
  with check (public.is_family_parent(family_id));

create policy "parents can update parental rules" on public.parental_rules
  for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

create policy "parents can delete parental rules" on public.parental_rules
  for delete to authenticated
  using (public.is_family_parent(family_id));

create policy "members can read blocked apps" on public.blocked_apps
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "parents can insert blocked apps" on public.blocked_apps
  for insert to authenticated
  with check (public.is_family_parent(family_id));

create policy "parents can delete blocked apps" on public.blocked_apps
  for delete to authenticated
  using (public.is_family_parent(family_id));

create policy "members can read usage schedules" on public.usage_schedules
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "parents can manage usage schedules" on public.usage_schedules
  for all to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

create policy "members can read usage reports" on public.usage_reports
  for select to authenticated
  using (public.is_family_member(family_id));

grant select, insert, update, delete on public.parental_rules to authenticated;
grant select, insert, delete on public.blocked_apps to authenticated;
grant select, insert, update, delete on public.usage_schedules to authenticated;
grant select on public.usage_reports to authenticated;
