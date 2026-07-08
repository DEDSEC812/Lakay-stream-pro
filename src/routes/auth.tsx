import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/lakay-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie !");
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, referred_by: ref },
          },
        });
        if (error) throw error;
        toast.success("Compte créé ! Bienvenue.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email de réinitialisation envoyé.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Échec de la connexion Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="Lakay Digital" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">
            LAKAY <span className="text-gradient">DIGITAL</span>
          </span>
        </Link>

        <div className="animate-float-up rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">
            {mode === "signin" && "Connexion"}
            {mode === "signup" && "Créer un compte"}
            {mode === "forgot" && "Mot de passe oublié"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" && "Ravi de vous revoir."}
            {mode === "signup" && "Commencez à diffuser en quelques secondes."}
            {mode === "forgot" && "Recevez un lien de réinitialisation par email."}
          </p>

          {ref && mode === "signup" && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              🎁 Vous avez été invité avec le code <b>{ref}</b>
            </div>
          )}

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary py-3 font-medium transition-colors hover:bg-muted"
              >
                <img src="https://www.google.com/favicon.ico" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
                Continuer avec Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field icon={UserIcon} placeholder="Nom" value={name} onChange={setName} />
            )}
            <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} required />
            {mode !== "forgot" && (
              <Field icon={Lock} type="password" placeholder="Mot de passe" value={password} onChange={setPassword} required />
            )}

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-primary"
              >
                Mot de passe oublié ?
              </button>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" && "Se connecter"}
              {mode === "signup" && "Créer mon compte"}
              {mode === "forgot" && "Envoyer le lien"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                Pas encore de compte ?{" "}
                <button onClick={() => setMode("signup")} className="font-semibold text-primary">
                  Inscrivez-vous
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Déjà inscrit ?{" "}
                <button onClick={() => setMode("signin")} className="font-semibold text-primary">
                  Connectez-vous
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="inline-flex items-center gap-1 font-semibold text-primary">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
