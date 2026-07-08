import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/paypal/return")({
  component: PaypalReturnPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
  }),
});

function PaypalReturnPage() {
  const navigate = useNavigate();
  const { session, refreshProfile } = useAuth();
  const search = Route.useSearch();
  const [state, setState] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      // Subscription approvals are already finalized by PayPal + our webhook —
      // nothing left to capture, just confirm and refresh the local profile.
      if (search.type === "subscription") {
        await refreshProfile();
        setState("success");
        return;
      }

      // One-time payments need an explicit server-side capture.
      if (!search.token || !session) {
        setState("error");
        setMessage("Paramètres de retour PayPal manquants.");
        return;
      }

      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId: search.token }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Échec de la capture du paiement");
        await refreshProfile();
        setState("success");
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Erreur inconnue");
      }
    };
    run();
  }, [search.token, search.type, session, refreshProfile]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {state === "processing" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Confirmation du paiement PayPal...</p>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h1 className="font-display text-xl font-bold">Paiement confirmé</h1>
          <p className="text-muted-foreground">Votre accès VIP est maintenant actif.</p>
          <button
            className="rounded-full bg-gradient-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-glow"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Retour au tableau de bord
          </button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="font-display text-xl font-bold">Un problème est survenu</h1>
          <p className="text-muted-foreground">{message}</p>
          <button
            className="rounded-full border border-border px-6 py-2.5 font-semibold"
            onClick={() => navigate({ to: "/boutique" })}
          >
            Retour à la boutique
          </button>
        </>
      )}
    </div>
  );
}
