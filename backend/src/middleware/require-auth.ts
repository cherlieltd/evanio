import type { MiddlewareHandler } from "hono";
import { getSupabaseAdmin, getSupabaseAnon } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export const requireAuth: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const token = extractBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  let user;
  try {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    user = data.user;
  } catch (error) {
    console.error("requireAuth getUser failed", error);
    const message =
      error instanceof Error && error.message.startsWith("Invalid environment")
        ? "Server misconfigured: missing Supabase env vars"
        : "Authentication service unavailable";
    return c.json({ error: message }, 503);
  }

  try {
    const { data: profile, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("suspended")
      .eq("id", user.id)
      .maybeSingle();

    // Ignore missing-column / missing-table until migrations are applied.
    if (!error && profile?.suspended) {
      return c.json({ error: "Account suspended" }, 403);
    }
  } catch (error) {
    console.error("requireAuth suspended check failed", error);
  }

  c.set("accessToken", token);
  c.set("user", user);
  await next();
};
