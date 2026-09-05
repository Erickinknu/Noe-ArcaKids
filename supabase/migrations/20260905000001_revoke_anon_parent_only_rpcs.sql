-- Security hardening: revoke PUBLIC/anon EXECUTE from RPCs that are parent-only
-- or trigger-only. These were executable by `anon` because PostgreSQL grants
-- EXECUTE to PUBLIC by default on new functions.
-- Parent app (authenticated) keeps access; child (anon) never calls these.

revoke execute on function public.upsert_study_mode_schedule(uuid, boolean, jsonb, jsonb, jsonb) from anon, public;
revoke execute on function public.upsert_device_policy(text, integer, boolean, time, time, text[]) from anon, public;
revoke execute on function public.handle_new_user() from anon, public;