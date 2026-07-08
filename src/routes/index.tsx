import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Link2,
  Radio,
  BarChart3,
  Zap,
  ShieldCheck,
  Users,
  Headphones,
  Play,
  Check,
  Facebook,
  Youtube,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/lakay-logo.png";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

const steps = [
  { icon: Link2, title: "Ajoutez", desc: "un lien vidéo YouTube existant" },
  { icon: Radio, title: "Diffusez", desc: "en direct sur Facebook Live" },
  { icon: BarChart3, title: "Gérez", desc: "et analysez vos performances" },
];

const features = [
  { icon: Zap, title: "Rapide & Facile", desc: "Diffusez en quelques clics, sans configuration technique." },
  { icon: ShieldCheck, title: "Stable & Sécurisé", desc: "Serveurs puissants et flux RTMP fiables." },
  { icon: Users, title: "Multi-plateformes", desc: "Facebook, YouTube, Twitch et plus encore." },
  { icon: Headphones, title: "Support 24/7", desc: "Notre équipe est là pour vous à tout moment." },
];

const plans = [
  {
    name: "Gratuit",
    price: "0",
    period: "",
    features: ["1 compte Facebook", "1 Live maximum", "Fonctionnalités limitées", "Support standard"],
    cta: "Commencer",
    highlight: false,
  },
  {
    name: "VIP",
    price: "19.99",
    period: "/mois",
    features: [
      "Lives illimités",
      "Plusieurs pages Facebook",
      "Changement de compte Facebook",
      "Priorité streaming",
      "Statistiques avancées",
      "Support prioritaire",
    ],
    cta: "Passer VIP",
    highlight: true,
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Lakay Digital" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="font-display text-lg font-bold tracking-tight">
              LAKAY <span className="text-gradient">DIGITAL</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Fonctionnalités</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Tarifs</a>
            <a href="#how" className="transition-colors hover:text-foreground">Comment ça marche</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block">
              Se connecter
            </Link>
            <Link
              to="/auth"
              className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Démarrer
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-7xl px-5 py-24 text-center md:py-36">
          <div className="animate-float-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
            Stream Pro — Diffusion en direct simplifiée
          </div>
          <h1 className="animate-float-up mx-auto max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Diffusez facilement vos vidéos{" "}
            <span className="text-gradient">en direct</span> à partir d'un lien
          </h1>
          <p className="animate-float-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Transformez vos vidéos YouTube existantes en diffusions Facebook Live
            professionnelles. Rapide, stable et 100% automatique.
          </p>
          <div className="animate-float-up mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              <Play className="h-5 w-5" /> Démarrer un Live
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-7 py-3.5 font-semibold transition-colors hover:bg-card"
            >
              Voir comment <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Youtube className="h-5 w-5 text-primary" /> YouTube</span>
            <span className="flex items-center gap-2"><Facebook className="h-5 w-5 text-accent" /> Facebook Live</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Comment ça marche</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Trois étapes simples pour passer en direct.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-gradient-navy p-8 shadow-card">
              <span className="absolute right-6 top-6 font-display text-5xl font-bold text-border">0{i + 1}</span>
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <s.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Pourquoi choisir <span className="text-gradient">Lakay Digital</span> ?
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Des tarifs simples</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Commencez gratuitement, passez VIP quand vous voulez.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 ${
                p.highlight
                  ? "border-primary bg-gradient-navy shadow-glow"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Populaire
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-4xl font-bold">${p.price}</span>
                <span className="mb-1 text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`mt-8 block rounded-full py-3 text-center font-semibold transition-transform hover:scale-[1.02] ${
                  p.highlight
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border border-border bg-secondary text-secondary-foreground"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-navy p-10 text-center shadow-card md:p-16">
          <img src={logo} alt="" width={64} height={64} className="mx-auto mb-6 h-16 w-16 object-contain" />
          <h2 className="text-3xl font-bold md:text-4xl">
            Votre succès, <span className="text-gradient">notre priorité</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Rejoignez les créateurs qui diffusent en direct sans effort.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-8 py-3.5 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            <Play className="h-5 w-5" /> Démarrer maintenant
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Lakay Digital" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="font-display font-semibold text-foreground">LAKAY DIGITAL</span>
          </div>
          <p>© {new Date().getFullYear()} Lakay Digital Stream Pro. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
