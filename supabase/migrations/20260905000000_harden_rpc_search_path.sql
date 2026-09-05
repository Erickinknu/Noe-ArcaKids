-- Security hardening: pin explicit search_path on RPC functions so object
-- resolution does not depend on the caller's mutable search_path.
-- Targets flagged by Supabase security advisor (function_search_path_mutable).
-- Bodies reference both pg_catalog builtins and public tables, so we pin to
-- pg_catalog,public (deterministic, keeps current behavior).

do $$
declare
  r record;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'haversine_distance',
        'get_child_achievements',
        'increment_achievement',
        'get_study_mode_schedule',
        'upsert_study_mode_schedule'
      )
  loop
    execute format('alter function %s set search_path = pg_catalog, public', r.oid::regprocedure);
  end loop;
end $$;