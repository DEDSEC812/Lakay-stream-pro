import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { paypalFetch, resolvePaypalPlanId } from "@/lib/paypal";

const bodySchema = z.object({ plan: z.enum(["vip_monthly", "vip_yearly"]) });

interface PayPalSubscription {
  id: string;
  links: { rel: string; href: string }[];
}

export const Route = createFileRoute("/api/paypal/create-subscription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userId, supabase } = await getAuthenticatedUser(request);

          const json = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Invalid request body" }, { status: 400 });
          }

          const planId = resolvePaypalPlanId(parsed.data.plan);
          const appUrl = process.env.APP_URL ?? "http://localhost:3000";

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, display_name")
            .eq("user_id", userId)
            .maybeSingle();

          const subscription = await paypalFetch<PayPalSubscription>("/v1/billing/subscriptions", {
            method: "POST",
            body: JSON.stringify({
              plan_id: planId,
              custom_id: userId,
              subscriber: profile?.email
                ? {
                    email_address: profile.email,
                    name: profile.display_name
                      ? { given_name: profile.display_name }
                      : undefined,
                  }
                : undefined,
              application_context: {
                brand_name: "Lakay Digital Stream Pro",
                user_action: "SUBSCRIBE_NOW",
                return_url: `${appUrl}/paypal/return?type=subscription`,
                cancel_url: `${appUrl}/boutique?paypal=cancelled`,
              },
            }),
          });

          const approveLink = subscription.links.find((l) => l.rel === "approve")?.href;
          if (!approveLink) {
            return Response.json({ error: "PayPal n'a pas retourné de lien d'approbation" }, { status: 502 });
          }

          return Response.json({ url: approveLink }, { status: 200 });
        } catch (err) {
          if (err instanceof AuthError) return Response.json({ error: err.message }, { status: err.status });
          console.error("paypal create-subscription error:", err);
          return Response.json({ error: "Impossible de créer l'abonnement PayPal" }, { status: 500 });
        }
      },
    },
  },
});
