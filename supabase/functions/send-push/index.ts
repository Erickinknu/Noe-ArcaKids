import \"jsr:@supabase/functions-js@2/edge-runtime.d.ts\";
import { createClient } from \"jsr:@supabase/supabase-js@2\";

const EXPO_PUSH_URL = \"https://exp.host/--/api/v2/push/send\";
const MAX_TITLE = 120;
const MAX_BODY = 500;

function isValidExpoPushToken(token) {
  if (!token || typeof token !== \"string\") return false;
  return (
    token.startsWith(\"ExponentPushToken[\") ||
    token.startsWith(\"ExpoPushToken[\") ||
    /^ExponentPushToken\\[[A-Za-z0-9_\\-]+\\]$/.test(token) ||
    /^ExpoPushToken\\[[A-Za-z0-9_\\-]+\\]$/.test(token) ||
    (token.length > 20 && !token.includes(\" \"))
  );
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function sendExpoPush(messages) {
  if (messages.length === 0) return [];
  const c = chunk(messages, 100);
  const all = [];
  for (const ch of c) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: \"POST\",
      headers: { \"Content-Type\": \"application/json\", Accept: \"application/json\", \"Accept-Encoding\": \"gzip, deflate\" },
      body: JSON.stringify(ch),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => \"\");
      throw new Error(\"Expo push HTTP \" + res.status + \": \" + t);
    }
    const data = await res.json();
    if (Array.isArray(data?.data)) all.push(...data.data);
  }
  return all;
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { \"Content-Type\": \"application/json\" } });
}

Deno.serve(async (req) => {
  if (req.method === \"OPTIONS\") {
    return new Response(null, {
      headers: {
        \"Access-Control-Allow-Origin\": \"*\",
        \"Access-Control-Allow-Headers\": \"authorization, x-client-info, apikey, content-type, x-push-secret\",
        \"Access-Control-Allow-Methods\": \"POST, OPTIONS\",
      },
    });
  }
  if (req.method !== \"POST\") return json(405, { error: \"Method not allowed\" });
  try {
    const body = await req.json().catch(() => ({}));
    const notification_id = body?.notification_id;
    if (!notification_id) return json(400, { error: \"notification_id required\" });

    const supabaseUrl = Deno.env.get(\"SUPABASE_URL\");
    const supabaseServiceKey = Deno.env.get(\"SUPABASE_SERVICE_ROLE_KEY\");
    const pushSecret = Deno.env.get(\"PUSH_ADMIN_SECRET\") ?? Deno.env.get(\"PUSH_SECRET\") ?? \"\";
    if (!supabaseUrl || !supabaseServiceKey) return json(500, { error: \"Missing Supabase env\" });

    const providedSecret = req.headers.get(\"x-push-secret\") ?? \"\";
    if (pushSecret === \"\" || providedSecret === \"\" || providedSecret !== pushSecret) {
      return json(401, { error: \"unauthorized\" });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: n, error: nerr } = await admin
      .from(\"notifications\")
      .select(\"user_id, title, body, data, family_id, child_id\")
      .eq(\"id\", notification_id)
      .maybeSingle();
    if (nerr) return json(500, { error: nerr.message });
    if (!n || !n.user_id) return json(404, { error: \"notification not found\" });

    const title = n.title ?? \"\";
    const messageBody = n.body ?? \"\";
    if (String(title).length > MAX_TITLE || String(messageBody).length > MAX_BODY) {
      return json(400, { error: \"title/body too long\" });
    }

    const { data: tokensRows, error: tokensErr } = await admin
      .from(\"push_tokens\")
      .select(\"token, user_id\")
      .eq(\"user_id\", n.user_id)
      .not(\"token\", \"is\", null);
    if (tokensErr) return json(500, { error: tokensErr.message });

    const tokens = (tokensRows || []).map((r) => r.token).filter((t) => isValidExpoPushToken(t));
    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) return json(200, { sent: 0, tickets: [] });

    const dataPayload = (n.data && typeof n.data === \"object\") ? n.data : {};
    const messages = uniqueTokens.map((to) => ({
      to,
      title,
      body: messageBody,
      data: { ...(dataPayload || {}), family_id: n.family_id, child_id: n.child_id, notification_id },
      sound: \"default\",
      channelId: \"default\",
      priority: \"high\",
    }));
    const tickets = await sendExpoPush(messages);
    const invalid = [];
    tickets.forEach((t, i) => {
      if (t.status === \"error\" && t.details?.error === \"DeviceNotRegistered\") {
        const tok = uniqueTokens[i];
        if (tok) invalid.push(tok);
      }
    });
    if (invalid.length > 0) await admin.from(\"push_tokens\").delete().in(\"token\", invalid);
    return json(200, { sent: uniqueTokens.length, tickets, cleaned: invalid.length });
  } catch (err) {
    return json(500, { error: err?.message || \"Internal error\" });
  }
});
