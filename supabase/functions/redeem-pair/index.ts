// Emparejamiento de dispositivo + aprovisionamiento de identidad.
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
//   3. redeem_pairing_code RPC (code redemption, one-time use) -> mapped errors
//   4. provisionDeviceIdentity: creates a per-device auth.users via service_role
//
// WHY A DEDICATED auth USER PER DEVICE (A2): the child app ships with the public
// anon key, so it cannot be trusted to prove which device it is. Knowledge of a
// device_uuid was enough to read every other device's data through the
// SECURITY DEFINER RPCs. After this change the child signs in with a real
// GoTrue credential and the RPCs authorize on auth.uid() via assert_device_claim,
// so a token for device A cannot touch device B.
//
// The one-time password is generated here, returned exactly once in this
// response, and never stored in plaintext anywhere: the only copy of the secret
// is GoTrue's internal hash, which is not readable from SQL or the Admin API.
//
// Deployed with verify_jwt = false (anon endpoint); all validation happens here.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

// Two clients with distinct purposes: a service-role client that may write to
// auth.users, and an anon client used for redemption, which needs no privileges.
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

const IP_LIMIT = 30;
const DEVICE_LIMIT = 30;
const WINDOW_SECONDS = 60;

// The synthetic email domain is intentionally non-deliverable, so a mis-issued
// credential can never reach a real inbox. .invalid is reserved by RFC 2606.
const DEVICE_EMAIL_DOMAIN = 'device-arcakids.invalid';

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
  const { error } = await anon.rpc('throttle', {
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

// One-time password: 32 bytes of cryptographic randomness in base64url. Entropy
// matters here because this value is the device's only credential and is never
// rotated by a human.
function generateOneTimePassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deviceEmail(deviceUuid: string): string {
  return `arca-${deviceUuid}@${DEVICE_EMAIL_DOMAIN}`;
}

// Creates the device's identity. Idempotent per device_uuid: if a credential
// already exists it is rotated rather than duplicated, so re-pairing never
// leaves an orphaned auth.users behind that still holds a live session.
//
// Returns the plaintext password, which exists only in this response.
async function provisionDeviceIdentity(
  deviceUuid: string,
): Promise<
  | { ok: true; password: string; email: string; authUserId: string }
  | { ok: false; error: string }
> {
  const email = deviceEmail(deviceUuid);
  const password = generateOneTimePassword();

  // Delete any previous identity. Without this an orphaned auth.users would
  // survive re-pairing: the child no longer knows its password, but an exported
  // session would still authenticate.
  const { data: existing, error: existingErr } = await admin
    .from('device_credentials')
    .select('auth_user_id')
    .eq('device_uuid', deviceUuid)
    .maybeSingle();

  if (existingErr) {
    return { ok: false, error: `CREDENTIAL_LOOKUP: ${existingErr.message}` };
  }

  if (existing?.auth_user_id) {
    await admin.auth.admin.deleteUser(existing.auth_user_id);
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    // No confirmation email: the device is not a person and .invalid cannot
    // receive mail. Without this the user would be created unconfirmed and
    // signInWithPassword would fail.
    email_confirm: true,
    user_metadata: { role: 'device', device_uuid: deviceUuid },
  });

  if (createErr || !created?.user) {
    return { ok: false, error: `CREATE_USER: ${createErr?.message ?? 'sin usuario'}` };
  }

  const { error: linkErr } = await admin.rpc('link_device_identity', {
    p_device_uuid: deviceUuid,
    p_auth_user_id: created.user.id,
    p_email: email,
  });

  if (linkErr) {
    // Roll the user back so we never leave an auth.users with no device behind
    // it: such a row could still authenticate but assert_device_claim would
    // resolve no device, and nobody could ever revoke it through the UI.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `LINK: ${linkErr.message}` };
  }

  return { ok: true, password, email, authUserId: created.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  try {
    const body = await req.json().catch(() => null);
    const code: string = String(body?.code ?? '').trim().toUpperCase();
    const deviceUuid: string = String(body?.deviceUuid ?? '').trim();
    const deviceName: string = String(body?.deviceName ?? 'ARCA KIDS device').trim() || 'ARCA KIDS device';
    const platform: string = String(body?.platform ?? 'android');

    if (!/^[A-Z0-9]{6,8}$/.test(code)) {
      return json({ error: { code: 'INVALID_CODE_FORMAT', message: 'Invalid code.' } }, 400);
    }
    if (!deviceUuid) {
      return json({ error: { code: 'MISSING_DEVICE_UUID', message: 'deviceUuid is required.' } }, 400);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceUuid)) {
      return json({ error: { code: 'INVALID_DEVICE_UUID', message: 'deviceUuid is malformed.' } }, 400);
    }

    const ip = clientIp(req);

    if (!(await throttleOk(`ip:${ip}`, IP_LIMIT))) {
      return json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }, 429);
    }
    if (!(await throttleOk(`pairing:${deviceUuid}`, DEVICE_LIMIT))) {
      return json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }, 429);
    }

    // Code redemption: this is what authorizes. If the code is invalid, auth is
    // never touched.
    const { data, error } = await anon.rpc('redeem_pairing_code', {
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

    // The code is spent and the device row exists. Now give it its own identity.
    // If this fails the pairing is half-done, so the error is explicit: the
    // parent must re-issue a code rather than assume it worked.
    const identity = await provisionDeviceIdentity(deviceUuid);
    if (!identity.ok) {
      return json(
        {
          error: {
            code: 'IDENTITY_PROVISION_FAILED',
            message: 'El dispositivo se vinculo, pero no se pudo crear su credencial.',
            detail: identity.error,
          },
        },
        500,
      );
    }

    return json({
      childId: String(row.child_id ?? ''),
      displayName: String(row.display_name ?? ''),
      avatarUrl: row.avatar_url == null ? null : String(row.avatar_url),
      familyId: String(row.family_id ?? ''),
      deviceAuth: { email: identity.email, password: identity.password },
    }, 200);
  } catch (cause) {
    return json({ error: { code: 'INTERNAL', message: String(cause instanceof Error ? cause.message : cause) } }, 500);
  }
});
