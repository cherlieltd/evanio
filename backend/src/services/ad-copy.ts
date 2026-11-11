import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { getEviModel, getOpenAI } from "../lib/openai.js";
import { assertSafeAdPrompt } from "./content-safety.js";
import { deductCredits } from "./credits.js";
import { loadGenerationBrandContext } from "./generation-context.js";
import {
  createGeneration,
  updateGeneration,
  type Generation,
} from "./generations.js";

export const generateAdCopyInputSchema = z.object({
  offerDescription: z.string().trim().min(8).max(1500),
  campaignGoal: z.string().trim().min(4).max(400),
  monthlyBudgetUsd: z.number().positive().max(1_000_000).optional(),
  platformFocus: z.enum(["both", "facebook", "google"]).default("both"),
});

export type GenerateAdCopyInput = z.infer<typeof generateAdCopyInputSchema>;

const audienceSuggestionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  platforms: z.array(z.enum(["facebook", "google", "both"])).default(["both"]),
});

const platformBudgetSchema = z.object({
  dailyBudgetUsd: z.number().positive(),
  suggestedDurationDays: z.number().int().positive(),
  bidStrategy: z.string().min(1),
  notes: z.string().min(1),
});

export const adCopyResultSchema = z.object({
  headlines: z.array(z.string().min(1)).min(3).max(12),
  primaryTexts: z.array(z.string().min(1)).min(3).max(8),
  ctas: z.array(z.string().min(1)).min(3).max(10),
  targetAudiences: z.array(audienceSuggestionSchema).min(2).max(6),
  budgetPlan: z.object({
    facebook: platformBudgetSchema,
    google: platformBudgetSchema,
    totalMonthlyUsd: z.number().positive(),
    rationale: z.string().min(1),
  }),
});

export type AdCopyResult = z.infer<typeof adCopyResultSchema>;

function buildUserPrompt(input: GenerateAdCopyInput): string {
  return [
    `Offer / product: ${input.offerDescription}`,
    `Campaign goal: ${input.campaignGoal}`,
    input.monthlyBudgetUsd
      ? `Monthly ad budget (USD): ${input.monthlyBudgetUsd}`
      : "Monthly ad budget: not specified — suggest a practical starter budget for a US small business.",
    `Platform focus: ${input.platformFocus}`,
  ].join("\n");
}

export async function generateAdCopy(
  userId: string,
  input: GenerateAdCopyInput,
): Promise<{ generation: Generation; result: AdCopyResult }> {
  await assertSafeAdPrompt(
    `${input.offerDescription}\n${input.campaignGoal}`,
  );

  const cost = CREDIT_COSTS.adCopyGenerate;
  await deductCredits(userId, cost, "ad_copy_generate");

  const userPrompt = buildUserPrompt(input);
  const generation = await createGeneration({
    userId,
    type: "copy",
    prompt: userPrompt,
    status: "processing",
    creditsUsed: cost,
  });

  try {
    const context = await loadGenerationBrandContext(userId);
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: getEviModel(),
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Evanio's Ad Copy & Campaign Planner for US small businesses.
Return strict JSON only. Write original copy. Never invent celebrity endorsements, other brands' trademarks, or adult content.
Match the business tone and brand when provided.
Headlines should fit Meta/Google limits (prefer under 40 characters when possible).
Primary texts should be punchy ad body copy (1-3 short sentences).
CTAs should be short button/action phrases.
Budget plan must include both Facebook and Google recommendations even if platform focus is one channel — mark the secondary channel as a lighter test budget.`,
        },
        {
          role: "user",
          content: `Create ad copy and a campaign plan.

Business & brand context:
${context.promptBlock}

Brief:
${userPrompt}

Return JSON exactly in this shape:
{
  "headlines": ["..."],
  "primaryTexts": ["..."],
  "ctas": ["..."],
  "targetAudiences": [
    { "name": "...", "description": "...", "platforms": ["facebook"|"google"|"both"] }
  ],
  "budgetPlan": {
    "facebook": {
      "dailyBudgetUsd": 20,
      "suggestedDurationDays": 14,
      "bidStrategy": "...",
      "notes": "..."
    },
    "google": {
      "dailyBudgetUsd": 15,
      "suggestedDurationDays": 14,
      "bidStrategy": "...",
      "notes": "..."
    },
    "totalMonthlyUsd": 1050,
    "rationale": "..."
  }
}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Ad copy model returned an empty response");
    }

    const parsed = adCopyResultSchema.parse(JSON.parse(raw));
    const saved = await updateGeneration(generation.id, {
      status: "completed",
      resultJson: parsed,
    });

    return { generation: saved, result: parsed };
  } catch (error) {
    await updateGeneration(generation.id, {
      status: "failed",
    }).catch((updateError) => {
      console.error("Failed to mark ad copy generation as failed", updateError);
    });
    throw error;
  }
}
