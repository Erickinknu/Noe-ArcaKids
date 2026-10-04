import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function toDate(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const raw = await req.text();
    const sig = req.headers.get("stripe-signature") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !service) return new Response("Missing env", { status: 500 });
    const supabase = createClient(supabaseUrl, service);

    let event;
    try {
      if (webhookSecret && sig) {
        const { constructEvent } = await import("https://esm.sh/stripe@17.4.0?target=deno");
        event = constructEvent(raw, sig, webhookSecret);
      } else {
        event = JSON.parse(raw);
      }
    } catch (e) {
      return new Response("Invalid signature", { status: 400 });
    }

    const type = event.type;
    const obj = event.data?.object || {};

    async function upsertSubscription(sub) {
      if (!sub) return;
      const familyId = sub.metadata?.family_id;
      const planSlug = sub.metadata?.plan_slug || sub.items?.data?.[0]?.price?.metadata?.plan_slug;
      if (!familyId) return;
      let planId = null;
      if (planSlug) {
        const { data: p } = await supabase.from("plans").select("id").eq("slug", planSlug).maybeSingle();
        planId = p?.id || null;
      }
      if (!planId) {
        const { data: pf } = await supabase.from("plans").select("id").eq("slug", "free").maybeSingle();
        planId = pf?.id;
      }
      if (!planId) return;
      await supabase.from("subscriptions").upsert(
        {
          family_id: familyId,
          plan_id: planId,
          user_id: sub.metadata?.user_id || null,
          status: sub.status,
          provider: "stripe",
          provider_sub_id: sub.id,
          provider_customer_id: sub.customer,
          current_period_start: toDate(sub.current_period_start),
          current_period_end: toDate(sub.current_period_end),
          cancel_at_period_end: !!sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? toDate(sub.canceled_at) : null,
          trial_end: sub.trial_end ? toDate(sub.trial_end) : null,
          metadata: sub.metadata || {},
        },
        { onConflict: "family_id,provider,provider_sub_id" }
      );
    }

    if (type === "checkout.session.completed") {
      const subId = obj.subscription;
      if (subId) {
        const { default: Stripe } = await import("https://esm.sh/stripe@17.4.0?target=deno");
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-06-20" });
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
        await upsertSubscription(sub);
      }
    }
    if (type === "customer.subscription.created" || type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      await upsertSubscription(obj);
    }
    if (type === "invoice.paid") {
      const subId = obj.subscription;
      if (subId) {
        const { default: Stripe } = await import("https://esm.sh/stripe@17.4.0?target=deno");
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2024-06-20" });
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
        await upsertSubscription(sub);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
});