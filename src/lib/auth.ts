/**
 * Authenticates a plain `Request` (used by our `src/routes/api/**` REST
 * handlers) against Supabase. Verifies the bearer JWT and returns both the
 * authenticated user's id and an RLS-scoped Supabase client acting as that
 * user — so every query made with it is automatically restricted to rows
 * that user is allowed to see/touch.
 *
 * Throws an `AuthError` (with an HTTP status attached) on any failure so
 * route handlers can turn it directly into a Response.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function getAuthenticatedUser(
  request: Request,
): Promise<{ userId: string; supabase: SupabaseClient<Database> }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new AuthError("Missing Authorization header");
  if (!authHeader.startsWith("Bearer ")) throw new AuthError("Only Bearer tokens are supported");

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token || token.split(".").length !== 3) throw new AuthError("Invalid token");

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new AuthError("Server is missing Supabase configuration", 500);
  }

  const supabase = createClient<Database>(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new AuthError("Invalid or expired session");

  return { userId: data.claims.sub as string, supabase };
}
