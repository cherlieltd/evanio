import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import {
  BusinessAlreadyExistsError,
  createBusiness,
  createBusinessInputSchema,
} from "../services/business.js";
import type { AppVariables } from "../types/context.js";

export const businessRoutes = new Hono<{ Variables: AppVariables }>();

businessRoutes.post("/business", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createBusinessInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid business payload",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const business = await createBusiness(user.id, parsed.data);
    return c.json({ business }, 201);
  } catch (error) {
    if (error instanceof BusinessAlreadyExistsError) {
      return c.json({ error: error.message }, 409);
    }

    console.error("POST /business failed", error);
    return c.json({ error: "Failed to create business" }, 500);
  }
});
