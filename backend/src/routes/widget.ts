import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import {
  getOrCreateWidgetForUser,
  listWidgetLeads,
  regenerateWidgetKey,
  updateWidgetForUser,
  updateWidgetSchema,
} from "../services/chat-widget.js";
import type { AppVariables } from "../types/context.js";

export const widgetRoutes = new Hono<{ Variables: AppVariables }>();

widgetRoutes.get("/widget", requireAuth, async (c) => {
  const user = c.get("user");
  try {
    const widget = await getOrCreateWidgetForUser(user.id);
    const apiBase =
      process.env.API_PUBLIC_URL ??
      `${c.req.url.split("/widget")[0] || "http://localhost:8080"}`;
    const embedSnippet = `<script src="${apiBase.replace(/\/$/, "")}/widget.js" data-key="${widget.public_key}" async></script>`;
    return c.json({ widget, embedSnippet });
  } catch (error) {
    console.error("GET /widget failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load widget",
      },
      500,
    );
  }
});

widgetRoutes.patch("/widget", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateWidgetSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const widget = await updateWidgetForUser(user.id, parsed.data);
    return c.json({ widget });
  } catch (error) {
    console.error("PATCH /widget failed", error);
    return c.json({ error: "Failed to update widget" }, 500);
  }
});

widgetRoutes.post("/widget/regenerate-key", requireAuth, async (c) => {
  const user = c.get("user");
  try {
    const widget = await regenerateWidgetKey(user.id);
    return c.json({ widget });
  } catch (error) {
    console.error("POST /widget/regenerate-key failed", error);
    return c.json({ error: "Failed to regenerate key" }, 500);
  }
});

widgetRoutes.get("/widget/leads", requireAuth, async (c) => {
  const user = c.get("user");
  const limit = Number(c.req.query("limit") ?? "50");
  try {
    const leads = await listWidgetLeads(
      user.id,
      Number.isFinite(limit) ? limit : 50,
    );
    return c.json({ leads });
  } catch (error) {
    console.error("GET /widget/leads failed", error);
    return c.json({ error: "Failed to load leads" }, 500);
  }
});
