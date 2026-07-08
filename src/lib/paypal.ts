/**
 * Server-only PayPal REST API helper. Never import into client code.
 *
 * PayPal's REST API is plain HTTP + OAuth2 client-credentials, so unlike
 * Stripe there's no official heavy SDK dependency needed — a thin fetch
 * wrapper is the standard, supported approach.
 */

let cachedToken: { value: string; expiresAt: number } | undefined;

function baseUrl(): string {
  const mode = process.env.PAYPAL_MODE ?? "sandbox";
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable. Set it in the server environment.`);
  }
  return value;
}

/** Fetches (and caches until near-expiry) an OAuth2 access token via client-credentials grant. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requireEnv("PAYPAL_CLIENT_SECRET");
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth token request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

/** Calls a PayPal REST API endpoint with an automatically-attached bearer token. */
export async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`PayPal API error (${res.status}) on ${path}: ${text}`);
  }
  return json as T;
}

/** Maps a client-chosen plan key to a real PayPal Billing Plan ID configured server-side. */
export const PAYPAL_PLAN_MAP = {
  vip_monthly: process.env.PAYPAL_PLAN_VIP_MONTHLY,
  vip_yearly: process.env.PAYPAL_PLAN_VIP_YEARLY,
} as const;

export type PaypalPlanKey = keyof typeof PAYPAL_PLAN_MAP;

export function resolvePaypalPlanId(planKey: string): string {
  const planId = PAYPAL_PLAN_MAP[planKey as PaypalPlanKey];
  if (!planId) {
    throw new Error(
      `Unknown or unconfigured PayPal plan "${planKey}". Set PAYPAL_PLAN_VIP_MONTHLY / PAYPAL_PLAN_VIP_YEARLY.`,
    );
  }
  return planId;
}

/** Fixed one-time price (in the smallest display unit, e.g. "19.99") for the "Paiement unique" option. */
export const PAYPAL_ONE_TIME_PRICE_USD = process.env.PAYPAL_ONE_TIME_PRICE_USD ?? "19.99";
