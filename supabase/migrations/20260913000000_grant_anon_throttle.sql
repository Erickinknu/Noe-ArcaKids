-- Grant anon execution of public.throttle() so the redeem-pair Edge Function
-- can enforce durable per-IP + per-device rate limits from its own committed
-- transactions (a failed PostgREST RPC would otherwise roll the ledger back).
-- Direct anon table access to api_throttle is permissive (no RLS) by design.

grant execute on function public.throttle(text, integer, integer) to anon;