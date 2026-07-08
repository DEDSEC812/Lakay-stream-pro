import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import logo from "@/assets/lakay-logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour !");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="Lakay Digital" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="font-display text-xl font-bold">
            LAKAY <span className="text-gradient">DIGITAL</span>
          </span>
        </Link>
        <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choisissez un nouveau mot de passe sécurisé.</p>
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-secondary px-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Mettre à jour
          </button>
        </form>
      </div>
    </div>
  );
}
