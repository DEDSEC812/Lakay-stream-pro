import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { paypalFetch } from "@/lib/paypal";

const bodySchema = z.object({ orderId: z.string().min(1) });

interface PayPalCapture {
  id: string;
  status: string;
  purchase_units: {
    custom_id?: string;
    payments?: { captures?: { id: string; amount: { value: string; currency_code: string } }[] };
  }[];
}

export const Route = createFileRoute("/api/paypal/capture-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { userId, supabase } = await getAuthenticatedUser(request);

          const json = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) return Response.json({ error: "Invalid request body" }, { status: 400 });

          // Capture funds for the previously-approved order.
          const capture = await paypalFetch<PayPalCapture>(
            `/v2/checkout/orders/${parsed.data.orderId}/capture`,
            { method: "POST" },
          );

          if (capture.status !== "COMPLETED") {
            return Response.json({ error: `Order status: ${capture.status}` }, { status: 402 });
          }

          const captureUnit = capture.purchase_units[0]?.payments?.captures?.[0];

          // One-time payment grants 30 days of VIP access from now.
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ plan: "vip", plan_expires_at: expiresAt, auto_renew: false })
            .eq("user_id", userId);
          if (profileError) throw profileError;

          if (captureUnit) {
            const { error: invoiceError } = await supabase.from("invoices").upsert(
              {
                user_id: userId,
                subscription_id: null,
                provider: "paypal",
                provider_invoice_id: captureUnit.id,
                amount_paid: Math.round(parseFloat(captureUnit.amount.value) * 100),
                currency: captureUnit.amount.currency_code.toLowerCase(),
                status: "paid",
                invoice_pdf_url: null,
              },
              { onConflict: "provider_invoice_id" },
            );
            if (invoiceError) throw invoiceError;
          }

          return Response.json({ success: true }, { status: 200 });
        } catch (err) {
          if (err instanceof AuthError) return Response.json({ error: err.message }, { status: err.status });
          console.error("paypal capture-order error:", err);
          return Response.json({ error: "Impossible de capturer le paiement PayPal" }, { status: 500 });
        }
      },
    },
  },
});
