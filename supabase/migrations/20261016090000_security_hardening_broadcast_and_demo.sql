-- Security hardening: broadcast triggers + demo/test RPCs reported by advisors
-- Idempotente, no destructivo.

do $$
begin
  begin
    execute 'revoke execute on function public.broadcast_device_policy() from public, anon';
  exception when undefined_function then null;
  end;
  begin
    execute 'revoke all on function public.broadcast_study_mode() from public, anon';
  exception when undefined_function then null;
  end;
  begin
    execute 'revoke execute on function public.create_test_family_for_demo() from public, anon';
  exception when undefined_function then null;
  end;
  begin
    execute 'revoke execute on function public.delete_test_family_by_id() from public, anon';
  exception when undefined_function then null;
  end;
  begin
    execute 'revoke execute on function public.force_delete_family_completely() from public, anon';
  exception when undefined_function then null;
  end;
end
$$;

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
