import type { MiddlewareHandler } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import type { AppVariables, ProfileRole } from "../types/context.js";

export const requireAdmin: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("requireAdmin profile lookup failed", error);
    return c.json({ error: "Failed to verify admin role" }, 500);
  }

  const role = profile?.role as ProfileRole | undefined;

  if (role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  c.set("profileRole", role);
  await next();
};
