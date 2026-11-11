import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing environment variable STRIPE_SECRET_KEY");
  }

  stripe = new Stripe(secretKey);
  return stripe;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing environment variable STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export function getWebOrigin(): string {
  return process.env.WEB_ORIGIN ?? "http://localhost:3000";
}
