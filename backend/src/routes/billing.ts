import { Hono } from "hono";
import { z } from "zod";
import {
  isCreditPackId,
  isPlanId,
} from "../config/billing.js";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createBillingPortalSession,
  createCreditCheckoutSession,
  createSubscriptionCheckoutSession,
  getBillingOverview,
} from "../services/billing.js";
import type { AppVariables } from "../types/context.js";

export const billingRoutes = new Hono<{ Variables: AppVariables }>();

billingRoutes.get("/billing", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const billing = await getBillingOverview(user.id);
    return c.json(billing);
  } catch (error) {
    console.error("GET /billing failed", error);
    return c.json({ error: "Failed to load billing" }, 500);
  }
});

billingRoutes.post("/billing/checkout-subscription", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ plan: z.string() }).safeParse(body);

  if (!parsed.success || !isPlanId(parsed.data.plan)) {
    return c.json({ error: "Invalid plan" }, 400);
  }

  try {
    const session = await createSubscriptionCheckoutSession(
      user.id,
      parsed.data.plan,
    );
    return c.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("POST /billing/checkout-subscription failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create subscription checkout",
      },
      500,
    );
  }
});

billingRoutes.post("/billing/checkout-credits", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ pack: z.string() }).safeParse(body);

  if (!parsed.success || !isCreditPackId(parsed.data.pack)) {
    return c.json({ error: "Invalid credit pack" }, 400);
  }

  try {
    const session = await createCreditCheckoutSession(
      user.id,
      parsed.data.pack,
    );
    return c.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("POST /billing/checkout-credits failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create credits checkout",
      },
      500,
    );
  }
});

billingRoutes.post("/billing/portal", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const session = await createBillingPortalSession(user.id);
    return c.json({ url: session.url });
  } catch (error) {
    console.error("POST /billing/portal failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create billing portal session",
      },
      500,
    );
  }
});
