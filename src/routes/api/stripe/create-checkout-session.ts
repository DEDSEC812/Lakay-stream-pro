import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { getStripe, resolvePriceId } from "@/lib/stripe";

const bodySchema = z.object({
  plan: z.enum(["vip_monthly", "vip_yearly"]),
});

export const Route = createFileRoute("/api/stripe/create-checkout-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate the caller — every protected billing endpoint requires a valid session.
          const { userId, supabase } = await getAuthenticatedUser(request);

          // 2. Validate input.
          const json = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
          }
          const { plan } = parsed.data;
          const priceId = resolvePriceId(plan);

          const stripe = getStripe();

          // 3. Find or create the Stripe customer for this user.
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("email, display_name, stripe_customer_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (profileError) throw profileError;

          let customerId = profile?.stripe_customer_id ?? undefined;
          if (!customerId) {
            const customer = await stripe.customers.create({
              email: profile?.email ?? undefined,
              name: profile?.display_name ?? undefined,
              metadata: { supabase_user_id: userId },
            });
            customerId = customer.id;
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ stripe_customer_id: customerId })
              .eq("user_id", userId);
            if (updateError) throw updateError;
          }

          // 4. Create the Checkout Session, tagging both the session and the
          // resulting subscription with metadata so the webhook can always
          // resolve which Supabase user it belongs to.
          const appUrl = process.env.APP_URL ?? "http://localhost:3000";
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appUrl}/dashboard?checkout=success`,
            cancel_url: `${appUrl}/boutique?checkout=cancelled`,
            client_reference_id: userId,
            allow_promotion_codes: true,
            metadata: { supabase_user_id: userId, plan_id: plan },
            subscription_data: {
              metadata: { supabase_user_id: userId, plan_id: plan },
            },
          });

          if (!session.url) {
            return Response.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
          }

          // 5. Return the URL for the client to redirect to.
          return Response.json({ url: session.url }, { status: 200 });
        } catch (err) {
          if (err instanceof AuthError) {
            return Response.json({ error: err.message }, { status: err.status });
          }
          console.error("create-checkout-session error:", err);
          return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
        }
      },
    },
  },
});
