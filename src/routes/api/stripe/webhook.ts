import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Pulls the fields we care about off a Stripe Subscription object and
 * upserts them into `subscriptions`, then mirrors the effective plan onto
 * `profiles` (used everywhere else in the app for fast, denormalized reads).
 */
async function syncSubscriptionFromStripe(sub: Stripe.Subscription, fallbackUserId?: string) {
  const supabase = getSupabaseAdmin();
  const userId = (sub.metadata?.supabase_user_id as string | undefined) ?? fallbackUserId;

  if (!userId) {
    console.error("Stripe webhook: subscription has no linked supabase_user_id", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const isEntitled = sub.status === "active" || sub.status === "trialing";

  let billingEmail: string | null = null;
  if (typeof sub.customer === "string") {
    const customer = await getStripe().customers.retrieve(sub.customer);
    billingEmail = "email" in customer ? (customer.email ?? null) : null;
  }

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "stripe",
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: item?.price?.id ?? null,
      plan: "vip",
      status: sub.status,
      billing_email: billingEmail,
      current_period_start: item?.current_period_start
        ? new Date(item.current_period_start * 1000).toISOString()
        : null,
      current_period_end: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (subError) throw subError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      plan: isEntitled ? "vip" : "free",
      plan_expires_at: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      auto_renew: isEntitled && !sub.cancel_at_period_end,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;
}

async function recordInvoice(invoice: Stripe.Invoice) {
  const supabase = getSupabaseAdmin();
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  const { data: subRow } = subId
    ? await supabase.from("subscriptions").select("id, user_id").eq("stripe_subscription_id", subId).maybeSingle()
    : { data: null };

  const userId = subRow?.user_id ?? (invoice.metadata?.supabase_user_id as string | undefined);
  if (!userId) {
    console.error("Stripe webhook: invoice has no resolvable user", invoice.id);
    return;
  }

  const { error } = await supabase.from("invoices").upsert(
    {
      user_id: userId,
      subscription_id: subRow?.id ?? null,
      provider: "stripe",
      provider_invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status ?? "paid",
      invoice_pdf_url: invoice.invoice_pdf ?? null,
    },
    { onConflict: "provider_invoice_id" },
  );
  if (error) throw error;
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
          console.error("Stripe webhook: missing signature header or STRIPE_WEBHOOK_SECRET");
          return new Response("Webhook not configured", { status: 500 });
        }

        // Signature verification requires the exact raw request body — never
        // JSON.parse it before this point, that would invalidate the signature.
        const rawBody = await request.text();
        const stripe = getStripe();

        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err) {
          console.error("Stripe webhook signature verification failed:", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Idempotency: Stripe may deliver the same event more than once.
        // Insert-first-wins into payment_events; a unique violation means
        // we've already processed this event, so we ack and stop.
        const { error: dedupeError } = await supabase
          .from("payment_events")
          .insert({ id: event.id, provider: "stripe", type: event.type });
        if (dedupeError) {
          return Response.json({ received: true, deduped: true }, { status: 200 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.mode === "subscription" && session.subscription) {
                const subId =
                  typeof session.subscription === "string" ? session.subscription : session.subscription.id;
                const sub = await stripe.subscriptions.retrieve(subId);
                await syncSubscriptionFromStripe(sub, session.client_reference_id ?? undefined);
              }
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
              const sub = event.data.object as Stripe.Subscription;
              await syncSubscriptionFromStripe(sub);
              break;
            }

            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.supabase_user_id as string | undefined;

              const { error } = await supabase
                .from("subscriptions")
                .update({ status: "canceled", cancel_at_period_end: true })
                .eq("stripe_subscription_id", sub.id);
              if (error) throw error;

              if (userId) {
                const { error: profileError } = await supabase
                  .from("profiles")
                  .update({ plan: "free", auto_renew: false })
                  .eq("user_id", userId);
                if (profileError) throw profileError;
              }
              break;
            }

            // Stripe still sends the older "invoice.payment_succeeded" name in
            // some API versions alongside the newer "invoice.paid" — handle both.
            case "invoice.paid":
            case "invoice.payment_succeeded": {
              const invoice = event.data.object as Stripe.Invoice;
              await recordInvoice(invoice);
              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              const subId =
                typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
              if (subId) {
                const { error } = await supabase
                  .from("subscriptions")
                  .update({ status: "past_due" })
                  .eq("stripe_subscription_id", subId);
                if (error) throw error;
              }
              break;
            }

            default:
              // Unhandled event types are acknowledged but ignored.
              break;
          }
        } catch (err) {
          console.error(`Stripe webhook handler error for event ${event.type}:`, err);
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true }, { status: 200 });
      },
    },
  },
});
