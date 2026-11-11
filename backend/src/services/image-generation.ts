import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { getOpenAI } from "../lib/openai.js";
import { uploadGenerationAsset } from "../lib/storage.js";
import { assertSafeAdPrompt } from "./content-safety.js";
import { deductCredits } from "./credits.js";
import { loadGenerationBrandContext } from "./generation-context.js";
import {
  createGeneration,
  updateGeneration,
  type Generation,
} from "./generations.js";

export const imageSizeSchema = z.enum(["1:1", "9:16", "16:9"]);
export type ImageSize = z.infer<typeof imageSizeSchema>;

export const generateImageInputSchema = z.object({
  productDescription: z.string().trim().min(8).max(1200),
  adGoal: z.string().trim().min(4).max(400),
  size: imageSizeSchema,
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

const SIZE_TO_OPENAI: Record<ImageSize, "1024x1024" | "1024x1792" | "1792x1024"> =
  {
    "1:1": "1024x1024",
    "9:16": "1024x1792",
    "16:9": "1792x1024",
  };

/**
 * Future image generation must go through this helper so brand kit is always applied.
 */
export async function buildBrandedImagePrompt(
  userId: string,
  userPrompt: string,
): Promise<{ prompt: string; brandKitLoaded: boolean }> {
  const context = await loadGenerationBrandContext(userId);

  return {
    brandKitLoaded: Boolean(context.brandKit),
    prompt: [
      userPrompt.trim(),
      "",
      "Follow this brand kit strictly for colors, typography feel, and overall style:",
      context.promptBlock,
    ].join("\n"),
  };
}

function buildUserFacingPrompt(input: GenerateImageInput): string {
  return [
    `Create a professional advertising image.`,
    `Product / offer: ${input.productDescription}`,
    `Ad goal: ${input.adGoal}`,
    `Aspect ratio: ${input.size}`,
    `Style: clean commercial photography / design suitable for paid social ads.`,
    `Do not include celebrity likenesses, other companies' trademarks or logos, or adult content.`,
  ].join("\n");
}

async function downloadImageBytes(url: string): Promise<{
  bytes: Buffer;
  contentType: string;
  extension: string;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const arrayBuffer = await response.arrayBuffer();
  const extension = contentType.includes("jpeg")
    ? "jpg"
    : contentType.includes("webp")
      ? "webp"
      : "png";

  return {
    bytes: Buffer.from(arrayBuffer),
    contentType,
    extension,
  };
}

export async function generateAdImage(
  userId: string,
  input: GenerateImageInput,
): Promise<Generation> {
  await assertSafeAdPrompt(
    `${input.productDescription}\n${input.adGoal}`,
  );
  const userPrompt = buildUserFacingPrompt(input);

  const cost = CREDIT_COSTS.imageGenerate;
  await deductCredits(userId, cost, "image_generate");

  const generation = await createGeneration({
    userId,
    type: "image",
    prompt: userPrompt,
    status: "processing",
    creditsUsed: cost,
  });

  try {
    const { prompt } = await buildBrandedImagePrompt(userId, userPrompt);
    const openai = getOpenAI();
    const model = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";

    const result = await openai.images.generate({
      model,
      prompt: prompt.slice(0, 3900),
      size: SIZE_TO_OPENAI[input.size],
      quality: "standard",
      n: 1,
      response_format: "url",
    });

    const imageUrl = result.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("Image API returned no image URL");
    }

    const downloaded = await downloadImageBytes(imageUrl);
    const publicUrl = await uploadGenerationAsset({
      userId,
      generationId: generation.id,
      filename: `${randomUUID()}.${downloaded.extension}`,
      bytes: downloaded.bytes,
      contentType: downloaded.contentType,
    });

    return updateGeneration(generation.id, {
      status: "completed",
      resultUrl: publicUrl,
      prompt,
    });
  } catch (error) {
    await updateGeneration(generation.id, {
      status: "failed",
    }).catch((updateError) => {
      console.error("Failed to mark image generation as failed", updateError);
    });
    throw error;
  }
}
