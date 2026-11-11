import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  getPublicWidgetConfig,
  publicChatSchema,
  publicLeadSchema,
  publicWidgetChat,
  publicWidgetLead,
  RateLimitError,
  InsufficientCreditsError,
} from "../services/chat-widget.js";

export const widgetPublicRoutes = new Hono();

widgetPublicRoutes.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

widgetPublicRoutes.get("/public/widget/:publicKey/config", async (c) => {
  const publicKey = c.req.param("publicKey");
  try {
    const config = await getPublicWidgetConfig(publicKey);
    return c.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    const status = /not found|disabled/i.test(message) ? 404 : 500;
    return c.json({ error: message }, status);
  }
});

widgetPublicRoutes.post("/public/widget/:publicKey/chat", async (c) => {
  const publicKey = c.req.param("publicKey");
  const body = await c.req.json().catch(() => null);
  const parsed = publicChatSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await publicWidgetChat(publicKey, parsed.data);
    return c.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      c.header("Retry-After", String(error.retryAfterSec));
      return c.json({ error: "Too many messages. Please try again shortly." }, 429);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json(
        { error: "This chat is temporarily unavailable. Please leave your contact details." },
        503,
      );
    }
    const message = error instanceof Error ? error.message : "Chat failed";
    const status = /not found|disabled/i.test(message) ? 404 : 500;
    console.error("POST /public/widget/:publicKey/chat failed", error);
    return c.json({ error: message }, status);
  }
});

widgetPublicRoutes.post("/public/widget/:publicKey/lead", async (c) => {
  const publicKey = c.req.param("publicKey");
  const body = await c.req.json().catch(() => null);
  const parsed = publicLeadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  try {
    const lead = await publicWidgetLead(publicKey, parsed.data);
    return c.json({ lead }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) {
      c.header("Retry-After", String(error.retryAfterSec));
      return c.json({ error: "Too many submissions. Please try again shortly." }, 429);
    }
    const message = error instanceof Error ? error.message : "Failed to save lead";
    const status = /not found|disabled/i.test(message) ? 404 : 500;
    console.error("POST /public/widget/:publicKey/lead failed", error);
    return c.json({ error: message }, status);
  }
});
