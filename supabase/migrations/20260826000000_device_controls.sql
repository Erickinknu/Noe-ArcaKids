-- Device control fields: blocking, sonic alerts, and real-time location.
-- These fields enable the parent app to block devices, trigger alerts,
-- and receive real-time GPS from children's devices.

-- ── Block device ──
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- ── Sonic alert ──
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS alert_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS alert_started_at timestamptz;

-- ── Real-time location ──
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- ── RPC: Block/unblock a child's device ──
CREATE OR REPLACE FUNCTION public.set_device_blocked(
  p_child_id uuid,
  p_blocked boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.devices
  SET is_blocked = p_blocked
  WHERE child_id = p_child_id;
END;
$$;

-- ── RPC: Trigger sonic alert on child's device ──
CREATE OR REPLACE FUNCTION public.trigger_device_alert(
  p_child_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.devices
  SET alert_active = true,
      alert_started_at = now()
  WHERE child_id = p_child_id;
END;
$$;

-- ── RPC: Dismiss sonic alert on child's device ──
CREATE OR REPLACE FUNCTION public.dismiss_device_alert(
  p_child_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.devices
  SET alert_active = false,
      alert_started_at = null
  WHERE child_id = p_child_id;
END;
$$;

-- ── RPC: Update child's GPS location ──
CREATE OR REPLACE FUNCTION public.update_device_location(
  p_child_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.devices
  SET latitude = p_latitude,
      longitude = p_longitude,
      location_updated_at = now()
  WHERE child_id = p_child_id;
END;
$$;

-- ── RPC: Get child's device state (for child app polling) ──
CREATE OR REPLACE FUNCTION public.get_device_state(
  p_child_id uuid
)
RETURNS TABLE (
  is_blocked boolean,
  alert_active boolean,
  alert_started_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT d.is_blocked, d.alert_active, d.alert_started_at
  FROM public.devices d
  WHERE d.child_id = p_child_id
  LIMIT 1;
$$;

-- ── RPC: Get children locations (for parent app map) ──
CREATE OR REPLACE FUNCTION public.get_children_locations()
RETURNS TABLE (
  child_id uuid,
  display_name text,
  avatar_url text,
  latitude double precision,
  longitude double precision,
  location_updated_at timestamptz,
  is_online boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.id AS child_id,
    c.display_name,
    c.avatar_url,
    d.latitude,
    d.longitude,
    d.location_updated_at,
    (d.last_seen_at IS NOT NULL AND d.last_seen_at > now() - interval '5 minutes') AS is_online
  FROM public.children c
  JOIN public.devices d ON d.child_id = c.id
  WHERE c.family_id = (
    SELECT p.family_id FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  )
  AND d.latitude IS NOT NULL
  AND d.longitude IS NOT NULL;
$$;
