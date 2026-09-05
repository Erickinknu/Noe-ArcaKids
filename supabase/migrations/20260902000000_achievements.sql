-- Achievements / gamification system

-- Achievement definitions (templates)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  icon text not null default '⭐',
  target_value integer not null default 1,
  achievement_type text not null default 'counter' check (achievement_type in ('counter', 'streak', 'milestone')),
  created_at timestamptz not null default now()
);

alter table public.achievements enable row level security;

do $$ begin
  create policy "Anyone can view achievements"
    on public.achievements for select
    using (true);
exception when duplicate_object then null;
end $$;

grant select on public.achievements to authenticated;
grant select on public.achievements to anon;

-- Child achievement progress
create table public.child_achievements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  current_value integer not null default 0,
  achieved boolean not null default false,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id, achievement_id)
);

alter table public.child_achievements enable row level security;

do $$ begin
  create policy "Family members manage child achievements"
    on public.child_achievements for all
    using (child_id in (
      select c.id from public.children c
      where c.family_id = (select family_id from profiles where user_id = auth.uid())
    ));
exception when duplicate_object then null;
end $$;

grant select, insert, update on public.child_achievements to authenticated;

create trigger child_achievements_set_updated_at
  before update on public.child_achievements
  for each row execute function public.set_updated_at();

create index child_achievements_child_id_idx on public.child_achievements (child_id);
create index child_achievements_achievement_id_idx on public.child_achievements (achievement_id);

-- RPC: Get all achievements with child progress
create or replace function public.get_child_achievements(p_child_id uuid)
returns table (
  achievement_id uuid,
  key text,
  title text,
  description text,
  icon text,
  target_value integer,
  achievement_type text,
  current_value integer,
  achieved boolean,
  achieved_at timestamptz
)
language sql security definer as $$
  select
    a.id as achievement_id,
    a.key,
    a.title,
    a.description,
    a.icon,
    a.target_value,
    a.achievement_type,
    coalesce(ca.current_value, 0) as current_value,
    coalesce(ca.achieved, false) as achieved,
    ca.achieved_at
  from public.achievements a
  left join public.child_achievements ca
    on ca.achievement_id = a.id and ca.child_id = p_child_id
  order by a.key;
$$;

grant execute on function public.get_child_achievements(uuid) to authenticated;

-- RPC: Increment achievement progress
create or replace function public.increment_achievement(
  p_child_id uuid,
  p_achievement_key text,
  p_increment integer default 1
)
returns void
language plpgsql security definer as $$
declare
  v_achievement_id uuid;
  v_target integer;
begin
  select id, target_value into v_achievement_id, v_target
  from public.achievements where key = p_achievement_key;

  if v_achievement_id is null then
    return;
  end if;

  insert into child_achievements (child_id, achievement_id, current_value, achieved)
  values (p_child_id, v_achievement_id, p_increment, p_increment >= v_target)
  on conflict (child_id, achievement_id)
  do update set
    current_value = child_achievements.current_value + p_increment,
    achieved = (child_achievements.current_value + p_increment) >= v_target,
    achieved_at = case
      when (child_achievements.current_value + p_increment) >= v_target and not child_achievements.achieved
      then now()
      else child_achievements.achieved_at
    end;
end;
$$;

grant execute on function public.increment_achievement(uuid, text, integer) to authenticated;

-- Seed default achievements
insert into public.achievements (key, title, description, icon, target_value, achievement_type) values
  ('first_day', 'Primer día', 'Usa el dispositivo por primera vez', '🌟', 1, 'milestone'),
  ('week_streak', 'Racha de 7 días', 'Usa la app 7 días seguidos', '🔥', 7, 'streak'),
  ('month_streak', 'Racha de 30 días', 'Usa la app 30 días seguidos', '💪', 30, 'streak'),
  ('early_bird', 'Madrugador', 'Desbloquea el dispositivo antes de las 7am', '🐦', 1, 'milestone'),
  ('night_owl', 'Búhu nocturno', 'Duerme antes de la hora de dormir 5 noches', '🦉', 5, 'counter'),
  ('digital_balance', 'Balance digital', 'No supere el límite diario 5 días seguidos', '⚖️', 5, 'streak'),
  ('explorer', 'Explorador', 'Use 10 apps diferentes en un día', '🗺️', 10, 'counter'),
  ('safe_zone', 'Zona segura', 'Permanezca dentro de la geocerca 7 días', '🏠', 7, 'counter'),
  ('study_champion', 'Campeón de estudio', 'Complete el modo estudio 5 días', '📚', 5, 'counter'),
  ('social_butterfly', 'Mariposa social', 'Use apps sociales menos de 30 min en un día', '🦋', 1, 'milestone')
on conflict (key) do nothing;
