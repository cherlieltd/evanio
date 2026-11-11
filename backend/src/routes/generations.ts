import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import { listGenerationsForUser } from "../services/generations.js";
import type { AppVariables } from "../types/context.js";

export const generationsRoutes = new Hono<{ Variables: AppVariables }>();

generationsRoutes.get("/generations", requireAuth, async (c) => {
  const user = c.get("user");
  const limitParam = Number(c.req.query("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? limitParam : 10;
  const typeParam = c.req.query("type");
  const type =
    typeParam === "image" || typeParam === "video" || typeParam === "copy"
      ? typeParam
      : undefined;

  try {
    const generations = await listGenerationsForUser(user.id, { limit, type });
    return c.json({ generations });
  } catch (error) {
    console.error("GET /generations failed", error);
    return c.json({ error: "Failed to load generations" }, 500);
  }
});

