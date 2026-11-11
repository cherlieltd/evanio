import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import { getMe } from "../services/me.js";
import type { AppVariables } from "../types/context.js";

export const meRoutes = new Hono<{ Variables: AppVariables }>();

meRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const me = await getMe(user.id);
    return c.json(me);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load /me";

    if (message === "Profile not found" || message.includes("Credit balance not found")) {
      return c.json({ error: message }, 404);
    }

    console.error("GET /me failed", error);
    return c.json({ error: "Failed to load account" }, 500);
  }
});
