-- Study mode schedules (synced from parent to child device)

create table public.study_mode_schedules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  enabled boolean not null default false,
  blocked_packages jsonb not null default '[]'::jsonb,
  days jsonb not null default '[]'::jsonb,
  hours jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id)
);

alter table public.study_mode_schedules enable row level security;

do $$ begin
  create policy "Family members manage study mode"
    on public.study_mode_schedules for all
    using (family_id = (
      select family_id from public.profiles where user_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.study_mode_schedules to authenticated;

create trigger study_mode_schedules_set_updated_at
  before update on public.study_mode_schedules
  for each row execute function public.set_updated_at();

-- RPC: Get study mode schedule for a child (used by ARCA KIDS)
create or replace function public.get_study_mode_schedule(p_child_id uuid)
returns jsonb
language sql security definer as $$
  select coalesce(
    jsonb_build_object(
      'enabled', sms.enabled,
      'blocked_packages', sms.blocked_packages,
      'days', sms.days,
      'hours', sms.hours
    ),
    '{"enabled": false, "blocked_packages": [], "days": [], "hours": []}'::jsonb
  )
  from public.study_mode_schedules sms
  where sms.child_id = p_child_id;
$$;

grant execute on function public.get_study_mode_schedule(uuid) to authenticated;
grant execute on function public.get_study_mode_schedule(uuid) to anon;

-- RPC: Upsert study mode schedule (used by NOE parent app)
create or replace function public.upsert_study_mode_schedule(
  p_child_id uuid,
  p_enabled boolean,
  p_blocked_packages jsonb,
  p_days jsonb,
  p_hours jsonb
)
returns void
language plpgsql security definer as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from children where id = p_child_id;

  insert into study_mode_schedules (family_id, child_id, enabled, blocked_packages, days, hours)
  values (v_family_id, p_child_id, p_enabled, p_blocked_packages, p_days, p_hours)
  on conflict (child_id)
  do update set
    enabled = p_enabled,
    blocked_packages = p_blocked_packages,
    days = p_days,
    hours = p_hours,
    updated_at = now();
end;
$$;

grant execute on function public.upsert_study_mode_schedule(uuid, boolean, jsonb, jsonb, jsonb) to authenticated;
