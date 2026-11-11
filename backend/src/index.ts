import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { adCopyRoutes } from "./routes/ad-copy.js";
import { adminRoutes } from "./routes/admin.js";
import { billingRoutes } from "./routes/billing.js";
import { brandKitRoutes } from "./routes/brand-kit.js";
import { businessRoutes } from "./routes/business.js";
import { eviRoutes } from "./routes/evi.js";
import { generationsRoutes } from "./routes/generations.js";
import { healthRoutes } from "./routes/health.js";
import { imagesRoutes } from "./routes/images.js";
import { meRoutes } from "./routes/me.js";
import { metaRoutes } from "./routes/meta.js";
import { postsRoutes } from "./routes/posts.js";
import { socialRoutes } from "./routes/social.js";
import { videosRoutes } from "./routes/videos.js";
import { widgetRoutes } from "./routes/widget.js";
import { widgetPublicRoutes } from "./routes/widget-public.js";
import { widgetScriptRoutes } from "./routes/widget-script.js";
import { hydrateBillingOverridesFromDb } from "./services/admin.js";
import type { AppVariables } from "./types/context.js";
import { metaWebhookRoutes } from "./webhooks/meta.js";
import { stripeWebhookRoutes } from "./webhooks/stripe.js";

const app = new Hono<{ Variables: AppVariables }>();

const allowedOrigins = [
  process.env.WEB_ORIGIN ?? "http://localhost:3000",
  process.env.ADMIN_ORIGIN ?? "http://localhost:3001",
  "https://www.evanio.ai",
  "https://evanio.ai",
  "https://admin.evanio.ai",
].filter((value, index, all) => all.indexOf(value) === index);

app.onError((error, c) => {
  console.error("Unhandled API error", error);
  const message =
    error instanceof Error && error.message.startsWith("Invalid environment")
      ? "Server misconfigured: missing Supabase env vars"
      : "Internal server error";
  return c.json({ error: message }, 500);
});

// Public embed endpoints must accept any customer origin.
app.route("/", widgetScriptRoutes);
app.route("/", widgetPublicRoutes);

app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path === "/widget.js" || path.startsWith("/public/")) {
    return next();
  }

  return cors({
    origin: (origin) =>
      !origin || allowedOrigins.includes(origin) ? origin || allowedOrigins[0] : null,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next);
});

app.route("/", healthRoutes);
app.route("/", meRoutes);
app.route("/", businessRoutes);
app.route("/", generationsRoutes);
app.route("/", imagesRoutes);
app.route("/", videosRoutes);
app.route("/", adCopyRoutes);
app.route("/", billingRoutes);
app.route("/", eviRoutes);
app.route("/", brandKitRoutes);
app.route("/", metaRoutes);
app.route("/", socialRoutes);
app.route("/", postsRoutes);
app.route("/", widgetRoutes);
app.route("/", adminRoutes);
app.route("/", metaWebhookRoutes);
app.route("/", stripeWebhookRoutes);

const port = Number(process.env.PORT ?? 8080);

void hydrateBillingOverridesFromDb().finally(() => {
  console.log(`Evanio API listening on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
});

export default app;
