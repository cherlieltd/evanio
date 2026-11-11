import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth.js";
import { UnsafePromptError } from "../services/content-safety.js";
import { InsufficientCreditsError } from "../services/credits.js";
import { listGenerationsForUser } from "../services/generations.js";
import {
  generateAdImage,
  generateImageInputSchema,
} from "../services/image-generation.js";
import type { AppVariables } from "../types/context.js";

export const imagesRoutes = new Hono<{ Variables: AppVariables }>();

imagesRoutes.get("/images", requireAuth, async (c) => {
  const user = c.get("user");
  const limitParam = Number(c.req.query("limit") ?? "24");
  const limit = Number.isFinite(limitParam) ? limitParam : 24;

  try {
    const images = await listGenerationsForUser(user.id, {
      limit,
      type: "image",
    });
    return c.json({ images });
  } catch (error) {
    console.error("GET /images failed", error);
    return c.json({ error: "Failed to load images" }, 500);
  }
});

imagesRoutes.post("/images/generate", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = generateImageInputSchema.safeParse(body);

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
    const generation = await generateAdImage(user.id, parsed.data);
    return c.json({ generation }, 201);
  } catch (error) {
    if (error instanceof UnsafePromptError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits" }, 402);
    }
    console.error("POST /images/generate failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      },
      500,
    );
  }
});
