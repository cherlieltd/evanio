import { Hono } from "hono";
import { getStripe, getStripeWebhookSecret } from "../lib/stripe.js";
import { processStripeEvent } from "../services/stripe-webhooks.js";

export const stripeWebhookRoutes = new Hono();

stripeWebhookRoutes.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  let event;
  try {
    const rawBody = await c.req.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error("Stripe signature verification failed", error);
    return c.json({ error: "Invalid Stripe signature" }, 400);
  }

  try {
    const result = await processStripeEvent(event);
    return c.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error(`Stripe webhook handler failed for ${event.type}`, error);
    return c.json({ error: "Webhook handler failed" }, 500);
  }
});
