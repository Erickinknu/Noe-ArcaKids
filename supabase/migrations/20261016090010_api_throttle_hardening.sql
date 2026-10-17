-- Endurecer acceso a api_throttle: RLS ya habilitado, aseguramos sin policies publicas
-- SECURITY DEFINER bypassa RLS, service_role tambien
ALTER TABLE public.api_throttle ENABLE ROW LEVEL SECURITY;
-- No policies necesarias; mantenerlo sin SELECT/INSERT/UPDATE/DELETE para anon/authenticated
