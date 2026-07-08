import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  X,
  Loader2,
  ArrowLeft,
  Crown,
  Receipt,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout, openBillingPortal, startPaypalSubscription, startPaypalOneTime } from "@/lib/billing-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/lakay-logo.png";

export const Route = createFileRoute("/boutique")({
  component: BoutiquePage,
});

const FEATURES: { label: string; free: boolean | string; vip: boolean | string }[] = [
  { label: "Lives programmés", free: "3 / mois", vip: "Illimités" },
  { label: "Plateformes simultanées", free: "1", vip: "Facebook, YouTube, Twitch" },
  { label: "Qualité de diffusion", free: "720p", vip: "1080p" },
  { label: "Statistiques avancées", free: false, vip: true },
  { label: "Badge bleu éligible", free: false, vip: true },
  { label: "Support prioritaire", free: false, vip: true },
  { label: "Historique des factures", free: false, vip: true },
];

const FAQ = [
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. La gestion de votre abonnement (annulation, changement de moyen de paiement, changement de plan) se fait depuis le portail de facturation sécurisé, accessible en un clic depuis cette page.",
  },
  {
    q: "Que se passe-t-il si j'annule en cours de mois ?",
    a: "Votre accès VIP reste actif jusqu'à la fin de la période déjà payée. Aucun remboursement au prorata n'est effectué automatiquement pour la période en cours.",
  },
  {
    q: "Puis-je passer du plan mensuel à l'annuel ?",
    a: "Oui, directement depuis le portail de facturation. Le changement est proraté automatiquement par Stripe.",
  },
  {
    q: "Les paiements sont-ils sécurisés ?",
    a: "Oui. Tous les paiements sont traités par Stripe, qui gère la conformité PCI-DSS. Lakay Digital ne stocke jamais vos données de carte bancaire.",
  },
];

interface SubscriptionRow {
  id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_price_id: string | null;
}

interface InvoiceRow {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created_at: string;
  invoice_pdf_url: string | null;
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Actif", variant: "default" },
    trialing: { label: "Essai", variant: "secondary" },
    past_due: { label: "Paiement en retard", variant: "destructive" },
    canceled: { label: "Annulé", variant: "outline" },
    unpaid: { label: "Impayé", variant: "destructive" },
    incomplete: { label: "Incomplet", variant: "outline" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

function BoutiquePage() {
  const navigate = useNavigate();
  const { user, session, profile, loading } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionRow | null;
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["my-invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as InvoiceRow[];
    },
  });

  const isActiveVip = subscription && (subscription.status === "active" || subscription.status === "trialing");

  const handleSubscribe = async (plan: "vip_monthly" | "vip_yearly") => {
    setCheckoutLoading(plan);
    try {
      await startCheckout(plan, session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de démarrer le paiement");
      setCheckoutLoading(null);
    }
  };

  const handlePaypalSubscribe = async (plan: "vip_monthly" | "vip_yearly") => {
    setCheckoutLoading(`paypal_${plan}`);
    try {
      await startPaypalSubscription(plan, session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de démarrer le paiement PayPal");
      setCheckoutLoading(null);
    }
  };

  const handlePaypalOneTime = async () => {
    setCheckoutLoading("paypal_one_time");
    try {
      await startPaypalOneTime(session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de démarrer le paiement PayPal");
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal(session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'ouvrir le portail de facturation");
      setPortalLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <img src={logo} alt="Lakay Digital" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display font-bold tracking-tight">
              <span className="text-gradient">Boutique</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 space-y-12">
        {/* Current subscription status */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Votre abonnement</h2>
          {subLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <Card>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/15 p-2.5 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{isActiveVip ? "Plan VIP" : "Plan Free"}</span>
                      {subscription && (
                        <Badge variant={statusLabel(subscription.status).variant}>
                          {statusLabel(subscription.status).label}
                        </Badge>
                      )}
                    </div>
                    {subscription?.current_period_end && (
                      <p className="text-sm text-muted-foreground">
                        {subscription.cancel_at_period_end ? "Se termine le " : "Renouvellement le "}
                        {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                    {!subscription && (
                      <p className="text-sm text-muted-foreground">
                        Vous n'avez pas encore d'abonnement actif.
                      </p>
                    )}
                  </div>
                </div>
                {profile?.stripe_customer_id && (
                  <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gérer / Annuler / Changer de plan
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Pricing cards */}
        <section>
          <h2 className="mb-1 font-display text-2xl font-bold">
            Choisissez votre <span className="text-gradient">plan</span>
          </h2>
          <p className="mb-6 text-muted-foreground">
            Diffusez sans limites, gagnez le badge bleu, accédez au support prioritaire.
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            <Card className="flex flex-col">
              <CardHeader>
                <h3 className="font-display text-lg font-bold">Free</h3>
                <p className="text-3xl font-bold">
                  0€ <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Pour découvrir la plateforme et diffuser occasionnellement.
                </p>
                <Button variant="outline" disabled className="w-full">
                  {isActiveVip ? "—" : "Plan actuel"}
                </Button>
              </CardContent>
            </Card>

            <Card className="relative flex flex-col border-primary shadow-lg shadow-primary/10">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Populaire</Badge>
              <CardHeader>
                <h3 className="font-display text-lg font-bold">VIP Mensuel</h3>
                <p className="text-3xl font-bold">
                  19,99€ <span className="text-sm font-normal text-muted-foreground">/mois</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Lives illimités, toutes les plateformes, badge bleu éligible.
                </p>
                <Button
                  className="w-full"
                  disabled={!!isActiveVip || checkoutLoading !== null}
                  onClick={() => handleSubscribe("vip_monthly")}
                >
                  {checkoutLoading === "vip_monthly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isActiveVip ? "Plan actuel" : "S'abonner"}
                </Button>
                {!isActiveVip && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={checkoutLoading !== null}
                    onClick={() => handlePaypalSubscribe("vip_monthly")}
                  >
                    {checkoutLoading === "paypal_vip_monthly" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Payer avec PayPal
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <h3 className="font-display text-lg font-bold">VIP Annuel</h3>
                <p className="text-3xl font-bold">
                  199€ <span className="text-sm font-normal text-muted-foreground">/an</span>
                </p>
                <p className="text-xs text-primary">Économisez ~17%</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Tous les avantages VIP, facturés une fois par an.
                </p>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={!!isActiveVip || checkoutLoading !== null}
                  onClick={() => handleSubscribe("vip_yearly")}
                >
                  {checkoutLoading === "vip_yearly" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isActiveVip ? "Plan actuel" : "S'abonner"}
                </Button>
                {!isActiveVip && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={checkoutLoading !== null}
                    onClick={() => handlePaypalSubscribe("vip_yearly")}
                  >
                    {checkoutLoading === "paypal_vip_yearly" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Payer avec PayPal
                  </Button>
                )}
                {!isActiveVip && (
                  <button
                    onClick={handlePaypalOneTime}
                    disabled={checkoutLoading !== null}
                    className="text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {checkoutLoading === "paypal_one_time" ? "..." : "Ou paiement unique de 30 jours (PayPal)"}
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature comparison */}
        <section>
          <h2 className="mb-4 font-display text-lg font-bold">Comparaison des fonctionnalités</h2>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonctionnalité</TableHead>
                  <TableHead className="text-center">Free</TableHead>
                  <TableHead className="text-center">VIP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEATURES.map((f) => (
                  <TableRow key={f.label}>
                    <TableCell className="font-medium">{f.label}</TableCell>
                    <TableCell className="text-center">
                      {typeof f.free === "string" ? (
                        f.free
                      ) : f.free ? (
                        <Check className="mx-auto h-4 w-4 text-primary" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {typeof f.vip === "string" ? (
                        f.vip
                      ) : f.vip ? (
                        <Check className="mx-auto h-4 w-4 text-primary" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* Invoice history */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
            <Receipt className="h-5 w-5" /> Historique des paiements
          </h2>
          {invoicesLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices && invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">
                          {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : "outline"}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.invoice_pdf_url ? (
                            <a
                              href={inv.invoice_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              PDF <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucune facture pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-4 font-display text-lg font-bold">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="rounded-lg border border-border px-2">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Paiements sécurisés par Stripe. Aucune donnée bancaire
          stockée sur nos serveurs.
        </p>
      </main>
    </div>
  );
}
