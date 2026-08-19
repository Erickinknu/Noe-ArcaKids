-- Reset legacy schema: drops tables inherited from a previous schema generation.
-- The remote project must be wiped of the legacy partial schema before applying
-- the new core schema. This migration is idempotent and safe to run anywhere.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Legacy schema functions (exact signatures from the previous schema generation)
drop function if exists public.acknowledge_command(p_command_id uuid);
drop function if exists public.add_child_profile(p_family_id uuid, p_full_name text, p_birth_date date);
drop function if exists public.apply_age_preset(p_family_id uuid, p_child_profile_id uuid, p_age integer);
drop function if exists public.approve_task(p_task_id uuid);
drop function if exists public.approve_time_request(p_request_id uuid, p_extra_minutes integer);
drop function if exists public.audit_action(p_family_id uuid, p_action text, p_entity text, p_entity_id uuid, p_metadata jsonb);
drop function if exists public.clear_family_pin(p_family_id uuid);
drop function if exists public.create_child_invite(p_family_id uuid, p_child_profile_id uuid, p_expires_minutes integer);
drop function if exists public.delete_rule(p_rule_id uuid);
drop function if exists public.delete_zone(p_zone_id uuid);
drop function if exists public.device_heartbeat(p_device_id uuid, p_battery smallint, p_service_active boolean, p_app_version text);
drop function if exists public.distance_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision);
drop function if exists public.get_pin_hash_for_device(p_device_id uuid);
drop function if exists public.hmac_invite(p_code text);
drop function if exists public.is_device_owner(p_device_id uuid);
drop function if exists public.is_family_member(p_family_id uuid);
drop function if exists public.is_family_parent(p_family_id uuid);
drop function if exists public.link_child(p_code text);
drop function if exists public.regenerate_child_invite(p_invite_id uuid);
drop function if exists public.reject_task(p_task_id uuid);
drop function if exists public.reject_time_request(p_request_id uuid);
drop function if exists public.report_location(p_device_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision, p_captured_at timestamp with time zone);
drop function if exists public.report_usage(p_device_id uuid, p_events jsonb);
drop function if exists public.set_family_pin(p_family_id uuid, p_pin text);
drop function if exists public.submit_task(p_task_id uuid);
drop function if exists public.unlink_child(p_device_id uuid);
drop function if exists public.update_child_profile(p_child_profile_id uuid, p_full_name text, p_birth_date date);
drop function if exists public.verify_family_pin(p_family_id uuid, p_pin text);

-- Legacy enum type (recreated by the new core schema)
drop type if exists public.app_role cascade;

drop table if exists public.step_daily cascade;
drop table if exists public.device_commands cascade;
drop table if exists public.daily_summaries cascade;
drop table if exists public.app_releases cascade;
drop table if exists public.app_catalog cascade;
drop table if exists public.age_presets cascade;
drop table if exists public.locations cascade;
drop table if exists public.geofences cascade;
drop table if exists public.family_settings cascade;
drop table if exists public.tasks cascade;
drop table if exists public.time_requests cascade;
drop table if exists public.activity_events cascade;
drop table if exists public.rules cascade;
drop table if exists public.sessions cascade;
drop table if exists public.devices cascade;
drop table if exists public.children cascade;
drop table if exists public.profiles cascade;
drop table if exists public.families cascade;

-- Additional legacy tables found on the first remote project (applied via
-- out-of-band cleanup on jvxeiexsmnoorhhphjld, kept for reproducibility)
drop table if exists public.app_secrets cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.child_devices cascade;
drop table if exists public.child_invites cascade;
drop table if exists public.child_profiles cascade;
drop table if exists public.family_members cascade;
drop table if exists public.notifications cascade;
drop table if exists public.zone_events cascade;