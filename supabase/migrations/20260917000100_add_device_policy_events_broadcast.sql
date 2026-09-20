-- Broadcast device policy changes to the child device (anon realtime),
-- mirroring the device_command_events pattern.
create table if not exists public.device_policy_events (
  id uuid primary key default gen_random_uuid(),
  device_uuid text not null,
  family_id uuid references public.families (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.device_policy_events enable row level security;

drop policy if exists "broadcast events readable by devices" on public.device_policy_events;
create policy "broadcast events readable by devices"
  on public.device_policy_events
  for select
  to anon, authenticated
  using (true);

grant select on public.device_policy_events to anon, authenticated;

create or replace function public.broadcast_device_policy()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.device_policy_events (device_uuid, family_id, child_id, event, payload)
  values (new.device_uuid, new.family_id, new.child_id, tg_op, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists trg_broadcast_device_policy on public.device_policies;
create trigger trg_broadcast_device_policy
  after insert or update on public.device_policies
  for each row execute function public.broadcast_device_policy();

alter publication supabase_realtime add table public.device_policy_events;