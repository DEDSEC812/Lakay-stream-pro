import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export const Route = createFileRoute("/api/stripe/create-billing-portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate the caller.
          const { userId, supabase } = await getAuthenticatedUser(request);

          // 2. Look up their Stripe Customer ID.
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (error) throw error;

          if (!profile?.stripe_customer_id) {
            return Response.json(
              { error: "Aucun abonnement Stripe trouvé pour ce compte." },
              { status: 404 },
            );
          }

          // 3. Create a Billing Portal session so the user can manage/cancel
          // their subscription, update payment method, and view invoices.
          const stripe = getStripe();
          const appUrl = process.env.APP_URL ?? "http://localhost:3000";
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${appUrl}/dashboard`,
          });

          return Response.json({ url: portalSession.url }, { status: 200 });
        } catch (err) {
          if (err instanceof AuthError) {
            return Response.json({ error: err.message }, { status: err.status });
          }
          console.error("create-billing-portal error:", err);
          return Response.json({ error: "Failed to create billing portal session" }, { status: 500 });
        }
      },
    },
  },
});
