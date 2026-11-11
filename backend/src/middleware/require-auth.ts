import type { MiddlewareHandler } from "hono";
import { getSupabaseAnon } from "../lib/supabase.js";
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

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const { getSupabaseAdmin } = await import("../lib/supabase.js");
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("suspended")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.suspended) {
    return c.json({ error: "Account suspended" }, 403);
  }

  c.set("accessToken", token);
  c.set("user", data.user);
  await next();
};
