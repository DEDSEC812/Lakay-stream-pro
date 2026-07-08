import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { paypalFetch, PAYPAL_ONE_TIME_PRICE_USD } from "@/lib/paypal";

interface PayPalOrder {
  id: string;
  links: { rel: string; href: string }[];
}

export const Route = createFileRoute("/api/paypal/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate — same rule as every protected billing endpoint.
          const { userId } = await getAuthenticatedUser(request);

          const appUrl = process.env.APP_URL ?? "http://localhost:3000";

          // 2. Create a PayPal Order (one-time payment, "Paiement unique").
          const order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", {
            method: "POST",
            body: JSON.stringify({
              intent: "CAPTURE",
              purchase_units: [
                {
                  custom_id: userId,
                  description: "Lakay Digital Stream Pro — accès VIP (paiement unique)",
                  amount: { currency_code: "USD", value: PAYPAL_ONE_TIME_PRICE_USD },
                },
              ],
              application_context: {
                brand_name: "Lakay Digital Stream Pro",
                user_action: "PAY_NOW",
                return_url: `${appUrl}/paypal/return`,
                cancel_url: `${appUrl}/boutique?paypal=cancelled`,
              },
            }),
          });

          const approveLink = order.links.find((l) => l.rel === "approve")?.href;
          if (!approveLink) {
            return Response.json({ error: "PayPal n'a pas retourné de lien d'approbation" }, { status: 502 });
          }

          return Response.json({ url: approveLink, orderId: order.id }, { status: 200 });
        } catch (err) {
          if (err instanceof AuthError) return Response.json({ error: err.message }, { status: err.status });
          console.error("paypal create-order error:", err);
          return Response.json({ error: "Impossible de créer la commande PayPal" }, { status: 500 });
        }
      },
    },
  },
});
