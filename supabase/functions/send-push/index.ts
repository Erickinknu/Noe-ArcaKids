import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function isValidExpoPushToken(token) {
  if (!token || typeof token !== "string") return false;
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[") ||
    /^ExponentPushToken\[[A-Za-z0-9_\-]+\]$/.test(token) ||
    /^ExpoPushToken\[[A-Za-z0-9_\-]+\]$/.test(token) ||
    (token.length > 20 && !token.includes(" "))
  );
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function sendExpoPush(messages) {
  if (messages.length === 0) return [];
  const c = chunk(messages, 100);
  const all = [];
  for (const ch of c) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(ch),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("Expo push HTTP " + res.status + ": " + t);
    }
    const data = await res.json();
    if (Array.isArray(data?.data)) all.push(...data.data);
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { user_ids, family_id, child_id, title, body: messageBody, data = {}, sound = "default", badge, channelId = "default", priority = "high", ttl } = body || {};
    if (!title && !messageBody) {
      return new Response(JSON.stringify({ error: "title or body required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let query = supabase.from("push_tokens").select("token, user_id").not("token", "is", null);
    if (Array.isArray(user_ids) && user_ids.length > 0) query = query.in("user_id", user_ids);
    if (family_id) {
      const { data: members } = await supabase.from("family_members").select("user_id").eq("family_id", family_id);
      const ids = (members || []).map((m) => m.user_id).filter(Boolean);
      if (ids.length === 0) return new Response(JSON.stringify({ sent: 0, tickets: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      query = query.in("user_id", ids);
    }
    const { data: tokensRows, error: tokensErr } = await query;
    if (tokensErr) return new Response(JSON.stringify({ error: tokensErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    const tokens = (tokensRows || []).map((r) => r.token).filter((t) => isValidExpoPushToken(t));
    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) return new Response(JSON.stringify({ sent: 0, tickets: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    const messages = uniqueTokens.map((to) => ({ to, title, body: messageBody, data: { ...(data || {}), family_id, child_id }, sound, badge, channelId, priority, ttl }));
    const tickets = await sendExpoPush(messages);
    const invalid = [];
    tickets.forEach((t, i) => {
      if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
        const tok = uniqueTokens[i];
        if (tok) invalid.push(tok);
      }
    });
    if (invalid.length > 0) await supabase.from("push_tokens").delete().in("token", invalid);
    return new Response(JSON.stringify({ sent: uniqueTokens.length, tickets, cleaned: invalid.length }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});