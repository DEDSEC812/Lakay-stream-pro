/**
 * Server-only Supabase client using the service-role key.
 *
 * This client bypasses Row Level Security entirely. It exists so that
 * webhook handlers — which have no logged-in user session to scope a normal
 * client to — can write billing data (subscription status, invoices, etc.)
 * on behalf of any user.
 *
 * NEVER import this into client-side code or expose SUPABASE_SERVICE_ROLE_KEY
 * to the browser. Use it only inside `src/routes/api/**` server handlers.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let _admin: SupabaseClient<Database> | undefined;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (_admin) return _admin;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    throw new Error(
      `Missing Supabase server environment variable(s): ${missing.join(", ")}. ` +
        `Find the service role key in Supabase Project Settings > API. Keep it out ` +
        `of any VITE_-prefixed variable.`,
    );
  }

  _admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
