-- api_throttle stores rate-limit ledger rows. Only server-side callers need it:
--   - public.throttle() is SECURITY DEFINER (runs as owner, bypasses RLS), used by the
--     redeem-pair Edge Function in committed transactions.
--   - service_role bypasses RLS by design.
-- Enabling RLS without policies blocks direct anon/authenticated PostgREST access to
-- the ledger while keeping the SECURITY DEFINER helpers fully operational.
-- NOT forcing RLS deliberately, so the table owner can still read rows.
ALTER TABLE "public"."api_throttle" ENABLE ROW LEVEL SECURITY;