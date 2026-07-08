import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { paypalFetch } from "@/lib/paypal";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

interface PayPalSubscriptionResource {
  id: string;
  plan_id: string;
  status: string;
  custom_id?: string;
  subscriber?: { email_address?: string };
  billing_info?: { next_billing_period_end_date?: string; last_payment?: { time?: string } };
}

interface PayPalSaleResource {
  id: string;
  billing_agreement_id?: string;
  custom?: string;
  amount?: { total?: string; currency?: string };
}

async function syncPaypalSubscription(resource: PayPalSubscriptionResource) {
  const supabase = getSupabaseAdmin();
  const userId = resource.custom_id;
  if (!userId) {
    console.error("PayPal webhook: subscription has no custom_id (user id)", resource.id);
    return;
  }

  const statusMap: Record<string, string> = {
    ACTIVE: "active",
    APPROVAL_PENDING: "incomplete",
    APPROVED: "incomplete",
    SUSPENDED: "past_due",
    CANCELLED: "canceled",
    EXPIRED: "canceled",
  };
  const status = statusMap[resource.status] ?? "incomplete";
  const isEntitled = status === "active";

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("paypal_subscription_id", resource.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    provider: "paypal",
    paypal_subscription_id: resource.id,
    paypal_plan_id: resource.plan_id,
    plan: "vip" as const,
    status: status as
      | "incomplete"
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "unpaid",
    billing_email: resource.subscriber?.email_address ?? null,
    current_period_end: resource.billing_info?.next_billing_period_end_date ?? null,
    cancel_at_period_end: status === "canceled",
  };

  const { error } = existing
    ? await supabase.from("subscriptions").update(row).eq("id", existing.id)
    : await supabase.from("subscriptions").insert(row);
  if (error) throw error;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      plan: isEntitled ? "vip" : "free",
      plan_expires_at: row.current_period_end,
      auto_renew: isEntitled,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;
}

async function recordPaypalSale(resource: PayPalSaleResource) {
  const supabase = getSupabaseAdmin();

  let userId: string | null = resource.custom ?? null;
  let subscriptionRowId: string | null = null;

  if (resource.billing_agreement_id) {
    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("paypal_subscription_id", resource.billing_agreement_id)
      .maybeSingle();
    if (subRow) {
      userId = userId ?? subRow.user_id;
      subscriptionRowId = subRow.id;
    }
  }

  if (!userId) {
    console.error("PayPal webhook: sale event has no resolvable user", resource.id);
    return;
  }

  const { error } = await supabase.from("invoices").upsert(
    {
      user_id: userId,
      subscription_id: subscriptionRowId,
      provider: "paypal",
      provider_invoice_id: resource.id,
      amount_paid: Math.round(parseFloat(resource.amount?.total ?? "0") * 100),
      currency: (resource.amount?.currency ?? "usd").toLowerCase(),
      status: "paid",
      invoice_pdf_url: null,
    },
    { onConflict: "provider_invoice_id" },
  );
  if (error) throw error;
}

export const Route = createFileRoute("/api/paypal/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
          console.error("PayPal webhook: missing PAYPAL_WEBHOOK_ID");
          return new Response("Webhook not configured", { status: 500 });
        }

        const rawBody = await request.text();
        let event: PayPalWebhookEvent;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Verify the signature via PayPal's verification API — required so
        // an attacker can't POST fake events directly to this endpoint.
        try {
          const verification = await paypalFetch<{ verification_status: string }>(
            "/v1/notifications/verify-webhook-signature",
            {
              method: "POST",
              body: JSON.stringify({
                transmission_id: request.headers.get("paypal-transmission-id"),
                transmission_time: request.headers.get("paypal-transmission-time"),
                cert_url: request.headers.get("paypal-cert-url"),
                auth_algo: request.headers.get("paypal-auth-algo"),
                transmission_sig: request.headers.get("paypal-transmission-sig"),
                webhook_id: webhookId,
                webhook_event: event,
              }),
            },
          );
          if (verification.verification_status !== "SUCCESS") {
            console.error("PayPal webhook signature verification failed");
            return new Response("Invalid signature", { status: 400 });
          }
        } catch (err) {
          console.error("PayPal webhook verification error:", err);
          return new Response("Verification error", { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Idempotency, same pattern as the Stripe webhook.
        const { error: dedupeError } = await supabase
          .from("payment_events")
          .insert({ id: event.id, provider: "paypal", type: event.event_type });
        if (dedupeError) {
          return Response.json({ received: true, deduped: true }, { status: 200 });
        }

        try {
          switch (event.event_type) {
            case "BILLING.SUBSCRIPTION.ACTIVATED":
            case "BILLING.SUBSCRIPTION.UPDATED":
            case "BILLING.SUBSCRIPTION.SUSPENDED":
            case "BILLING.SUBSCRIPTION.CANCELLED":
            case "BILLING.SUBSCRIPTION.EXPIRED": {
              await syncPaypalSubscription(event.resource as unknown as PayPalSubscriptionResource);
              break;
            }
            case "PAYMENT.SALE.COMPLETED": {
              await recordPaypalSale(event.resource as unknown as PayPalSaleResource);
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error(`PayPal webhook handler error for ${event.event_type}:`, err);
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true }, { status: 200 });
      },
    },
  },
});
