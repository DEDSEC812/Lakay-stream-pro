import type { Session } from "@supabase/supabase-js";

async function callBillingApi(path: string, session: Session | null, body?: unknown) {
  if (!session) throw new Error("Vous devez être connecté.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `Erreur (${res.status})`);
  }
  return json as { url: string };
}

/** Starts a Stripe Checkout session for the given plan and redirects the browser to it. */
export async function startCheckout(plan: "vip_monthly" | "vip_yearly", session: Session | null) {
  const { url } = await callBillingApi("/api/stripe/create-checkout-session", session, { plan });
  window.location.href = url;
}

/** Opens the Stripe Billing Portal (manage payment method, change plan, cancel, view invoices). */
export async function openBillingPortal(session: Session | null) {
  const { url } = await callBillingApi("/api/stripe/create-billing-portal", session);
  window.location.href = url;
}

/** Starts a recurring PayPal subscription for the given plan and redirects to PayPal's approval page. */
export async function startPaypalSubscription(plan: "vip_monthly" | "vip_yearly", session: Session | null) {
  const { url } = await callBillingApi("/api/paypal/create-subscription", session, { plan });
  window.location.href = url;
}

/** Starts a one-time PayPal payment (30 days of VIP access) and redirects to PayPal's approval page. */
export async function startPaypalOneTime(session: Session | null) {
  const { url } = await callBillingApi("/api/paypal/create-order", session);
  window.location.href = url;
}
