-- Restaura prune_study_mode_events() desde
-- supabase/migrations/20260929000000_study_mode_event_privacy.sql (ll.68-84).
-- Su eliminacion rompio trg_broadcast_study_mode: toda escritura en
-- study_mode_schedules fallaba. Aplicada en prod 2026-10-08.
create or replace function public.prune_study_mode_events()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  removed integer;
begin
  delete from public.study_mode_events
   where created_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$function$;

revoke all on function public.prune_study_mode_events() from public;
