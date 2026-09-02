-- Parent preferences (notification prefs), feedback, and per-profile install block flag.

-- ── Notification preferences ──
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  daily_report boolean not null default true,
  bedtime_alert boolean not null default false,
  app_blocked boolean not null default true,
  time_limit_reached boolean not null default true,
  device_offline boolean not null default true,
  location_alert boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.notification_preferences to authenticated;

-- ── Feedback / suggestions ──
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Users manage own feedback"
  on public.feedback for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.feedback to authenticated;

-- ── Per-profile flag: block new app installs (enforced by ArcaKids) ──
alter table public.profiles add column if not exists block_installs boolean not null default false;