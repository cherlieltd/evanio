import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import {
  generateAdCopy,
  generateAdCopyInputSchema,
  adCopyResultSchema,
  type AdCopyResult,
} from "../services/ad-copy.js";
import { UnsafePromptError } from "../services/content-safety.js";
import { InsufficientCreditsError } from "../services/credits.js";
import { listGenerationsForUser } from "../services/generations.js";
import type { AppVariables } from "../types/context.js";

export const adCopyRoutes = new Hono<{ Variables: AppVariables }>();

function parseStoredResult(value: unknown): AdCopyResult | null {
  const parsed = adCopyResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

adCopyRoutes.get("/ad-copy", requireAuth, async (c) => {
  const user = c.get("user");
  const limitParam = Number(c.req.query("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? limitParam : 20;

  try {
    const generations = await listGenerationsForUser(user.id, {
      limit,
      type: "copy",
    });

    return c.json({
      items: generations.map((generation) => ({
        generation,
        result: parseStoredResult(generation.result_json ?? null),
      })),
    });
  } catch (error) {
    console.error("GET /ad-copy failed", error);
    return c.json({ error: "Failed to load ad copy history" }, 500);
  }
});

adCopyRoutes.post("/ad-copy/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = generateAdCopyInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  try {
    const { generation, result } = await generateAdCopy(user.id, parsed.data);
    return c.json({ generation, result }, 201);
  } catch (error) {
    if (error instanceof UnsafePromptError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits" }, 402);
    }
    console.error("POST /ad-copy/generate failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate ad copy",
      },
      500,
    );
  }
});
