import { Hono } from "hono";
import {
  getMetaWebhookVerifyToken,
  verifyMetaSignature,
} from "../lib/meta.js";
import { processMetaWebhookPayload } from "../services/meta-webhooks.js";

export const metaWebhookRoutes = new Hono();

metaWebhookRoutes.get("/webhooks/meta", async (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === getMetaWebhookVerifyToken() && challenge) {
    return c.text(challenge, 200);
  }

  return c.json({ error: "Verification failed" }, 403);
});

metaWebhookRoutes.post("/webhooks/meta", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  // Acknowledge quickly; process async.
  void processMetaWebhookPayload(payload).catch((error) => {
    console.error("Meta webhook processing failed", error);
  });

  return c.json({ received: true });
});
