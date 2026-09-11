// Server-side rate limiting for pairing code redemption.
//
// WHY AN EDGE FUNCTION? A PostgREST RPC that raises an exception aborts its
// transaction, rolling back any throttle bookkeeping done in the same call
// (the api_throttle ledger). A Supabase Edge Function makes several independent
// DB round-trips: the throttle() calls COMMIT normally (even when we later
// answer 429/400 as a plain JSON response), so the per-IP + per-device counters
// are durable. This is the only way to rate-limit redeem properly.
//
// Layer order:
//   1. per-IP throttle (30 req/60s)  -> 429
//   2. per-device throttle (30 req/60s) -> 429
//   3. redeem_pairing_code RPC (same ACL/policies as before) -> mapped errors
//
// Deployed with verify_jwt = false (anon endpoint); all validation happens here.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const IP_LIMIT = 30;
const DEVICE_LIMIT = 30;
const WINDOW_SECONDS = 60;

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || 'unknown';
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function throttleOk(key: string, limit: number): Promise<boolean> {
  const { error } = await supabase.rpc('throttle', {
    p_key: key,
    p_max: limit,
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error && String(error.message ?? error.code ?? '').includes('RATE_LIMITED')) {
    return false;
  }
  if (error) {
    throw error;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  try {
    const body = await req.json().catch(() => null);
    const code: string = String(body?.code ?? '').trim().toUpperCase();
    const deviceUuid = String(body?.deviceUuid ?? '').trim();
    const deviceName = String(body?.deviceName ?? 'ARCA KIDS device').trim() || 'ARCA KIDS device';
    const platform = String(body?.platform ?? 'android');

    if (!/^[A-Z0-9]{6,8}$/.test(code)) {
      return json({ error: { code: 'INVALID_CODE_FORMAT', message: 'Invalid code.' } }, 400);
    }
    if (!deviceUuid) {
      return json({ error: { code: 'MISSING_DEVICE_UUID', message: 'deviceUuid is required.' } }, 400);
    }

    const ip = clientIp(req);

    if (!(await throttleOk(`ip:${ip}`, IP_LIMIT))) {
      return json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }, 429);
    }
    if (!(await throttleOk(`pairing:${deviceUuid}`, DEVICE_LIMIT))) {
      return json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }, 429);
    }

    const { data, error } = await supabase.rpc('redeem_pairing_code', {
      p_code: code,
      p_device_uuid: deviceUuid,
      p_device_name: deviceName,
      p_platform: platform,
    });

    if (error) {
      const msg = String(error.message ?? '').toUpperCase();
      let status = 400;
      if (msg.includes('RATE_LIMITED')) status = 429;
      else if (msg.includes('TOO_MANY_ATTEMPTS')) status = 423;
      return json({ error: { code: msg.startsWith('RATE_LIMITED') ? 'RATE_LIMITED' : msg.split('\n')[0].trim(), message: error.message } }, status);
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) {
      return json({ error: { code: 'NO_CHILD', message: 'The code could not be redeemed.' } }, 400);
    }
    return json({
      childId: String(row.child_id ?? ''),
      displayName: String(row.display_name ?? ''),
      avatarUrl: row.avatar_url == null ? null : String(row.avatar_url),
      familyId: String(row.family_id ?? ''),
    }, 200);
  } catch (cause) {
    return json({ error: { code: 'INTERNAL', message: String(cause instanceof Error ? cause.message : cause) } }, 500);
  }
});