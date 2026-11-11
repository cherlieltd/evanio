import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import {
  adminAdjustUserCredits,
  billingSettingsUpdateSchema,
  getAdminBillingSettings,
  getAdminOverview,
  getAdminUsage,
  getAdminUserDetails,
  listAdminCreditTransactions,
  listAdminGenerations,
  listAdminSubscriptions,
  listAdminUsers,
  listFailedGenerations,
  retryFailedGeneration,
  setUserSuspended,
  updateAdminBillingSettings,
} from "../services/admin.js";
import { InsufficientCreditsError } from "../services/credits.js";
import { getMe } from "../services/me.js";
import type { AppVariables } from "../types/context.js";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use("/admin/*", requireAuth, requireAdmin);

adminRoutes.get("/admin/me", async (c) => {
  const user = c.get("user");
  try {
    const me = await getMe(user.id);
    return c.json(me);
  } catch (error) {
    console.error("GET /admin/me failed", error);
    return c.json({ error: "Failed to load admin profile" }, 500);
  }
});

adminRoutes.get("/admin/overview", async (c) => {
  try {
    const overview = await getAdminOverview();
    return c.json(overview);
  } catch (error) {
    console.error("GET /admin/overview failed", error);
    return c.json({ error: "Failed to load overview" }, 500);
  }
});

adminRoutes.get("/admin/users", async (c) => {
  const q = c.req.query("q") ?? undefined;
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  try {
    const result = await listAdminUsers({
      q,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    return c.json(result);
  } catch (error) {
    console.error("GET /admin/users failed", error);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

adminRoutes.get("/admin/users/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const details = await getAdminUserDetails(id);
    return c.json(details);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return c.json({ error: "User not found" }, 404);
    }
    console.error("GET /admin/users/:id failed", error);
    return c.json({ error: "Failed to load user" }, 500);
  }
});

adminRoutes.post("/admin/users/:id/credits", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      amount: z.number().int().refine((n) => n !== 0),
      reason: z.string().trim().min(3).max(200),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const credits = await adminAdjustUserCredits({
      userId: id,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      adminId: user.id,
    });
    return c.json({ credits });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits for this adjustment" }, 402);
    }
    console.error("POST /admin/users/:id/credits failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to adjust credits",
      },
      500,
    );
  }
});

adminRoutes.get("/admin/subscriptions", async (c) => {
  const limit = Number(c.req.query("limit") ?? "100");
  try {
    const result = await listAdminSubscriptions(
      Number.isFinite(limit) ? limit : 100,
    );
    return c.json(result);
  } catch (error) {
    console.error("GET /admin/subscriptions failed", error);
    return c.json({ error: "Failed to load subscriptions" }, 500);
  }
});

adminRoutes.get("/admin/usage", async (c) => {
  try {
    const result = await getAdminUsage();
    const failed = await listFailedGenerations(50);
    return c.json({ ...result, failedGenerations: failed.generations });
  } catch (error) {
    console.error("GET /admin/usage failed", error);
    return c.json({ error: "Failed to load usage" }, 500);
  }
});

adminRoutes.get("/admin/credits", async (c) => {
  const limit = Number(c.req.query("limit") ?? "100");
  try {
    const result = await listAdminCreditTransactions(
      Number.isFinite(limit) ? limit : 100,
    );
    return c.json(result);
  } catch (error) {
    console.error("GET /admin/credits failed", error);
    return c.json({ error: "Failed to load credit transactions" }, 500);
  }
});

adminRoutes.get("/admin/generations/failed", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  try {
    const result = await listFailedGenerations(
      Number.isFinite(limit) ? limit : 50,
    );
    return c.json(result);
  } catch (error) {
    console.error("GET /admin/generations/failed failed", error);
    return c.json({ error: "Failed to load failed generations" }, 500);
  }
});

adminRoutes.get("/admin/generations", async (c) => {
  const limit = Number(c.req.query("limit") ?? "100");
  const status = c.req.query("status") ?? undefined;
  try {
    const result = await listAdminGenerations({
      status,
      limit: Number.isFinite(limit) ? limit : 100,
    });
    return c.json(result);
  } catch (error) {
    console.error("GET /admin/generations failed", error);
    return c.json({ error: "Failed to load generations" }, 500);
  }
});

adminRoutes.post("/admin/generations/:id/retry", async (c) => {
  const id = c.req.param("id");
  try {
    const generation = await retryFailedGeneration(id);
    return c.json({ generation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retry generation";
    const status =
      message === "Generation not found"
        ? 404
        : message.includes("Only failed") || message.includes("supports video")
          ? 400
          : 500;
    console.error("POST /admin/generations/:id/retry failed", error);
    return c.json({ error: message }, status);
  }
});

adminRoutes.post("/admin/users/:id/suspend", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      suspended: z.boolean(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const profile = await setUserSuspended(id, parsed.data.suspended);
    return c.json({ profile });
  } catch (error) {
    console.error("POST /admin/users/:id/suspend failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update user",
      },
      500,
    );
  }
});

adminRoutes.get("/admin/settings/billing", async (c) => {
  try {
    const settings = await getAdminBillingSettings();
    return c.json(settings);
  } catch (error) {
    console.error("GET /admin/settings/billing failed", error);
    return c.json({ error: "Failed to load billing settings" }, 500);
  }
});

adminRoutes.put("/admin/settings/billing", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = billingSettingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const settings = await updateAdminBillingSettings(parsed.data, user.id);
    return c.json(settings);
  } catch (error) {
    console.error("PUT /admin/settings/billing failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update billing settings",
      },
      500,
    );
  }
});
