/**
 * Server-only Stripe client.
 *
 * IMPORTANT: this file reads `STRIPE_SECRET_KEY`, a server secret. Never
 * import it from a React component, a client-only module, or anything that
 * ends up in the browser bundle — only from files under `src/routes/api/**`
 * or other server-only code (route `server.handlers`, server functions).
 */
import Stripe from "stripe";

let _stripe: Stripe | undefined;

/** Lazily creates (and caches) the Stripe SDK client. Throws a clear error
 * if the secret key hasn't been configured, instead of failing obscurely
 * deep inside the Stripe SDK. */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable. Set it in your server " +
        "environment (Render/Vercel project settings) — never as a VITE_-prefixed " +
        "variable, which would leak it to the browser.",
    );
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
    appInfo: { name: "Lakay Digital Stream Pro" },
  });
  return _stripe;
}

/**
 * Maps a client-chosen plan key to the real Stripe Price ID configured
 * server-side. The client only ever sends a plan key like "vip_monthly" —
 * never a raw Stripe price ID — so a tampered request can't be used to
 * purchase an arbitrary price.
 */
export const STRIPE_PRICE_MAP = {
  vip_monthly: process.env.STRIPE_PRICE_VIP_MONTHLY,
  vip_yearly: process.env.STRIPE_PRICE_VIP_YEARLY,
} as const;

export type PlanKey = keyof typeof STRIPE_PRICE_MAP;

export function resolvePriceId(planKey: string): string {
  const priceId = STRIPE_PRICE_MAP[planKey as PlanKey];
  if (!priceId) {
    throw new Error(
      `Unknown or unconfigured plan "${planKey}". Set STRIPE_PRICE_VIP_MONTHLY / ` +
        `STRIPE_PRICE_VIP_YEARLY in the server environment.`,
    );
  }
  return priceId;
}
