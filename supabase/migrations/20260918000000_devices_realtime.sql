-- Realtime live locations: expose `devices` so parents receive UPDATE events
-- when a child device reports a new GPS position. RLS (`members can read devices`)
-- keeps payloads scoped to the caller's family; the child app (anon) cannot read
-- any devices row, so the device never sees other families' positions.
do $$
begin
  alter publication supabase_realtime add table public.devices;
exception when duplicate_object then null;
end
$$;