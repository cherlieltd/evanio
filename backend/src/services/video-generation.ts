import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { getVideoQueue, type VideoJobData } from "../queues/video-queue.js";
import { assertSafeAdPrompt } from "./content-safety.js";
import { deductCredits, refundCredits } from "./credits.js";
import { loadGenerationBrandContext } from "./generation-context.js";
import {
  createGeneration,
  updateGeneration,
  type Generation,
} from "./generations.js";

export const videoAspectSchema = z.enum(["9:16", "16:9"]);
export type VideoAspect = z.infer<typeof videoAspectSchema>;

export const videoSecondsSchema = z.enum(["4", "8", "12"]);
export type VideoSeconds = z.infer<typeof videoSecondsSchema>;

export const generateVideoInputSchema = z.object({
  productDescription: z.string().trim().min(8).max(1200),
  adGoal: z.string().trim().min(4).max(400),
  aspectRatio: videoAspectSchema.default("9:16"),
  seconds: videoSecondsSchema.default("8"),
});

export type GenerateVideoInput = z.infer<typeof generateVideoInputSchema>;

const ASPECT_TO_SIZE: Record<
  VideoAspect,
  VideoJobData["size"]
> = {
  "9:16": "720x1280",
  "16:9": "1280x720",
};

/**
 * Future video generation must go through this helper so brand kit is always applied.
 */
export async function buildBrandedVideoPrompt(
  userId: string,
  userPrompt: string,
): Promise<{ prompt: string; brandKitLoaded: boolean }> {
  const context = await loadGenerationBrandContext(userId);

  return {
    brandKitLoaded: Boolean(context.brandKit),
    prompt: [
      userPrompt.trim(),
      "",
      "Keep motion, titles, and art direction aligned to this brand kit:",
      context.promptBlock,
    ].join("\n"),
  };
}

function buildUserFacingPrompt(input: GenerateVideoInput): string {
  return [
    `Create a short advertising video for paid social.`,
    `Product / offer: ${input.productDescription}`,
    `Ad goal: ${input.adGoal}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Duration: ${input.seconds} seconds`,
    `Style: clean commercial motion suitable for Meta/TikTok/YouTube ads.`,
    `Do not include celebrity likenesses, other companies' trademarks or logos, or adult content.`,
  ].join("\n");
}

export async function enqueueVideoGeneration(
  userId: string,
  input: GenerateVideoInput,
): Promise<Generation> {
  await assertSafeAdPrompt(`${input.productDescription}\n${input.adGoal}`);

  const cost = CREDIT_COSTS.videoGenerate;
  await deductCredits(userId, cost, "video_generate");

  const userPrompt = buildUserFacingPrompt(input);
  const { prompt } = await buildBrandedVideoPrompt(userId, userPrompt);

  let generation: Generation;
  try {
    generation = await createGeneration({
      userId,
      type: "video",
      prompt,
      status: "queued",
      creditsUsed: cost,
      resultJson: {
        aspectRatio: input.aspectRatio,
        seconds: input.seconds,
        size: ASPECT_TO_SIZE[input.aspectRatio],
      },
    });
  } catch (error) {
    await refundCredits(
      userId,
      cost,
      "video_generate_refund",
      `video_create_failed_${Date.now()}_${userId}`,
    ).catch((refundError) => {
      console.error("Failed to refund after generation insert error", refundError);
    });
    throw error;
  }

  try {
    const queue = getVideoQueue();
    await queue.add(
      "generate-video",
      {
        generationId: generation.id,
        userId,
        prompt,
        size: ASPECT_TO_SIZE[input.aspectRatio],
        seconds: input.seconds,
        creditsUsed: cost,
      },
      {
        jobId: generation.id,
      },
    );
  } catch (error) {
    await updateGeneration(generation.id, { status: "failed" }).catch(
      (updateError) => {
        console.error("Failed to mark video as failed after enqueue error", updateError);
      },
    );
    await refundCredits(
      userId,
      cost,
      "video_generate_refund",
      `video_refund_${generation.id}`,
    ).catch((refundError) => {
      console.error("Failed to refund after enqueue error", refundError);
    });
    throw error;
  }

  return generation;
}
