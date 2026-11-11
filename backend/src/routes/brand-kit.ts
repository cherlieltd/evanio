import { Hono } from "hono";
import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { requireAuth } from "../middleware/require-auth.js";
import {
  brandColorsSchema,
  brandFontsSchema,
  generateBrandKit,
  getBrandKitForUser,
  updateBrandKit,
  uploadBrandLogo,
} from "../services/brand-kit.js";
import {
  deductCredits,
  InsufficientCreditsError,
} from "../services/credits.js";
import type { AppVariables } from "../types/context.js";

export const brandKitRoutes = new Hono<{ Variables: AppVariables }>();

const updateSchema = z.object({
  colors: brandColorsSchema.optional(),
  fonts: brandFontsSchema.optional(),
  tagline: z.string().trim().max(120).nullable().optional(),
  style_notes: z.string().trim().max(2000).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
});

brandKitRoutes.get("/brand-kit", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const result = await getBrandKitForUser(user.id);
    return c.json(result);
  } catch (error) {
    console.error("GET /brand-kit failed", error);
    return c.json({ error: "Failed to load brand kit" }, 500);
  }
});

brandKitRoutes.post("/brand-kit/generate", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    await deductCredits(
      user.id,
      CREDIT_COSTS.brandKitGenerate,
      "brand_kit_generate",
    );
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits" }, 402);
    }
    console.error("Brand kit credit deduction failed", error);
    return c.json({ error: "Failed to deduct credits" }, 500);
  }

  try {
    const brandKit = await generateBrandKit(user.id);
    return c.json({ brandKit }, 201);
  } catch (error) {
    console.error("POST /brand-kit/generate failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate brand kit",
      },
      500,
    );
  }
});

brandKitRoutes.patch("/brand-kit", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid brand kit payload" }, 400);
  }

  try {
    const brandKit = await updateBrandKit(user.id, parsed.data);
    return c.json({ brandKit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update brand kit";
    const status =
      message.includes("not found") || message.includes("Generate a brand kit")
        ? 404
        : 500;
    if (status === 500) {
      console.error("PATCH /brand-kit failed", error);
    }
    return c.json({ error: message }, status);
  }
});

brandKitRoutes.post("/brand-kit/upload-logo", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const form = await c.req.parseBody();
    const file = form.file;

    if (!file || typeof file === "string") {
      return c.json({ error: "file is required" }, 400);
    }

    const contentType = file.type || "image/png";
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]);

    if (!allowed.has(contentType)) {
      return c.json({ error: "Unsupported image type" }, 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength === 0) {
      return c.json({ error: "Empty file" }, 400);
    }
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    const brandKit = await uploadBrandLogo(user.id, {
      bytes,
      contentType,
      filename: file.name || "logo.png",
    });

    return c.json({ brandKit });
  } catch (error) {
    console.error("POST /brand-kit/upload-logo failed", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload logo",
      },
      500,
    );
  }
});
