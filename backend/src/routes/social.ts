import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth.js";
import {
  deleteSocialAccount,
  listSocialAccountsForUser,
  updateSocialAccountSettings,
} from "../services/social-accounts.js";
import { sendManualInboxReply } from "../services/social-auto-reply.js";
import {
  getInboxItemForUser,
  listInboxItemsForUser,
  updateInboxItem,
} from "../services/social-inbox.js";
import type { AppVariables } from "../types/context.js";

export const socialRoutes = new Hono<{ Variables: AppVariables }>();

socialRoutes.get("/social/accounts", requireAuth, async (c) => {
  const user = c.get("user");
  try {
    const accounts = await listSocialAccountsForUser(user.id);
    return c.json({ accounts });
  } catch (error) {
    console.error("GET /social/accounts failed", error);
    return c.json({ error: "Failed to load social accounts" }, 500);
  }
});

socialRoutes.patch("/social/accounts/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      auto_reply_enabled: z.boolean(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  try {
    const account = await updateSocialAccountSettings(user.id, id, parsed.data);
    return c.json({ account });
  } catch (error) {
    console.error("PATCH /social/accounts/:id failed", error);
    return c.json({ error: "Failed to update account" }, 500);
  }
});

socialRoutes.delete("/social/accounts/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    await deleteSocialAccount(user.id, id);
    return c.json({ ok: true });
  } catch (error) {
    console.error("DELETE /social/accounts/:id failed", error);
    return c.json({ error: "Failed to disconnect account" }, 500);
  }
});

socialRoutes.get("/social/inbox", requireAuth, async (c) => {
  const user = c.get("user");
  const status = c.req.query("status") ?? undefined;
  const limit = Number(c.req.query("limit") ?? "50");

  try {
    const items = await listInboxItemsForUser(user.id, {
      status,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    return c.json({ items });
  } catch (error) {
    console.error("GET /social/inbox failed", error);
    return c.json({ error: "Failed to load inbox" }, 500);
  }
});

socialRoutes.post("/social/inbox/:id/reply", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      message: z.string().trim().min(1).max(1000),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  try {
    const item = await sendManualInboxReply({
      userId: user.id,
      itemId: id,
      message: parsed.data.message,
    });
    return c.json({ item });
  } catch (error) {
    console.error("POST /social/inbox/:id/reply failed", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to send reply",
      },
      500,
    );
  }
});

socialRoutes.post("/social/inbox/:id/handoff", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const existing = await getInboxItemForUser(user.id, id);
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  try {
    const item = await updateInboxItem(id, {
      status: "handed_off",
      handoff_reason: "Marked for human follow-up",
      confidence: existing.confidence ?? "low",
    });
    return c.json({ item });
  } catch (error) {
    console.error("POST /social/inbox/:id/handoff failed", error);
    return c.json({ error: "Failed to hand off" }, 500);
  }
});
