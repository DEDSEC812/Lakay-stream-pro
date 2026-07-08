import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Home,
  Radio,
  Calendar,
  Eye,
  Users,
  Play,
  Plus,
  Bell,
  BarChart3,
  LogOut,
  Crown,
  BadgeCheck,
  Gift,
  Copy,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/lakay-logo.png";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

const stats = [
  { icon: Calendar, label: "Lives programmés", value: "0" },
  { icon: Radio, label: "Lives actifs", value: "0" },
  { icon: Eye, label: "Vues totales", value: "0" },
  { icon: Users, label: "Abonnés", value: "0" },
];

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const name = profile?.display_name ?? "créateur";
  const isVip = profile?.plan === "vip";

  const copyReferral = () => {
    const link = `${window.location.origin}/auth?ref=${profile?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien de parrainage copié !");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Lakay Digital" width={36} height={36} className="h-9 w-9 object-contain" />
            <span className="font-display font-bold tracking-tight">
              LAKAY <span className="text-gradient">DIGITAL</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden items-center gap-1.5 rounded-full border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-foreground sm:flex"
              >
                <ShieldCheck className="h-4 w-4" /> Admin
              </Link>
            )}
            <button className="relative rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="animate-float-up flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">Bonjour, {name} 👋</h1>
          {profile?.has_blue_badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              <BadgeCheck className="h-4 w-4 text-accent" /> Promoteur
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isVip ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {isVip && <Crown className="h-4 w-4" />} {isVip ? "VIP" : "Gratuit"}
          </span>
        </div>
        <p className="mt-1 text-muted-foreground">Prêt à passer en direct ?</p>

        <div className="animate-float-up mt-6 overflow-hidden rounded-2xl border border-border bg-gradient-navy p-6 shadow-card md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Play className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Démarrer un Live</h2>
              <p className="text-sm text-muted-foreground">Diffusez une vidéo YouTube en direct sur Facebook.</p>
            </div>
          </div>
          <button
            onClick={() => toast.info("La création de Live arrive bientôt !")}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 md:mt-0 md:w-auto"
          >
            <Plus className="h-5 w-5" /> Nouveau Live
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Referral card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Parrainez & gagnez</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              10 filleuls vérifiés = 1 Live Facebook gratuit 🎁
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm">
              <span className="truncate text-muted-foreground">
                /auth?ref=<b className="text-foreground">{profile?.referral_code}</b>
              </span>
              <button onClick={copyReferral} className="ml-auto text-primary">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Free lives card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Lives gratuits disponibles</h3>
            <p className="mt-1 text-sm text-muted-foreground">Utilisables sur Facebook Live.</p>
            <p className="mt-4 font-display text-3xl font-bold text-gradient">
              {profile?.free_lives_balance ?? 0}
            </p>
          </div>
        </div>

        {!isVip && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-gradient-navy p-6 shadow-glow md:flex-row">
            <div className="flex items-center gap-4">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Passez au plan VIP</h3>
                <p className="text-sm text-muted-foreground">
                  Lives illimités, plusieurs pages Facebook, priorité serveur.
                </p>
              </div>
            </div>
            <Link
              to="/boutique"
              className="rounded-full bg-gradient-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-glow"
            >
              Découvrir VIP
            </Link>
          </div>
        )}
      </main>

      <nav className="sticky bottom-0 border-t border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-5 py-2">
          {[
            { icon: Home, label: "Accueil", active: true },
            { icon: Radio, label: "Lives" },
            { icon: BarChart3, label: "Statistiques" },
            { icon: Users, label: "Profil" },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs ${
                item.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
