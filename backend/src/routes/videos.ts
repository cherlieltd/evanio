import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import { UnsafePromptError } from "../services/content-safety.js";
import { InsufficientCreditsError } from "../services/credits.js";
import { listGenerationsForUser } from "../services/generations.js";
import {
  enqueueVideoGeneration,
  generateVideoInputSchema,
} from "../services/video-generation.js";
import type { AppVariables } from "../types/context.js";

export const videosRoutes = new Hono<{ Variables: AppVariables }>();

videosRoutes.get("/videos", requireAuth, async (c) => {
  const user = c.get("user");
  const limitParam = Number(c.req.query("limit") ?? "24");
  const limit = Number.isFinite(limitParam) ? limitParam : 24;

  try {
    const videos = await listGenerationsForUser(user.id, {
      limit,
      type: "video",
    });
    return c.json({ videos });
  } catch (error) {
    console.error("GET /videos failed", error);
    return c.json({ error: "Failed to load videos" }, 500);
  }
});

videosRoutes.post("/videos/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = generateVideoInputSchema.safeParse(body);

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
    const generation = await enqueueVideoGeneration(user.id, parsed.data);
    return c.json({ generation }, 201);
  } catch (error) {
    if (error instanceof UnsafePromptError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits" }, 402);
    }
    console.error("POST /videos/generate failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to queue video",
      },
      500,
    );
  }
});
