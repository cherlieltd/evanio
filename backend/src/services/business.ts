import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";

export const createBusinessInputSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(120),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => {
      const raw = value?.trim() ?? "";
      if (!raw) return null;
      return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    }),
  industry: z.string().trim().min(1, "Industry is required").max(120),
  description: z.string().trim().min(1, "Describe what you sell").max(2000),
  target_audience: z.string().trim().min(1, "Target audience is required").max(1000),
  tone: z.string().trim().min(1, "Brand tone is required").max(120),
});

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;

const businessSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  target_audience: z.string().nullable(),
  tone: z.string().nullable(),
  created_at: z.string(),
});

export type Business = z.infer<typeof businessSchema>;

export class BusinessAlreadyExistsError extends Error {
  constructor() {
    super("Business already exists for this user");
    this.name = "BusinessAlreadyExistsError";
  }
}

export async function getBusinessForUser(userId: string): Promise<Business | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, user_id, name, website, industry, description, target_audience, tone, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load business: ${error.message}`);
  }

  return data ? businessSchema.parse(data) : null;
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<Business> {
  const existing = await getBusinessForUser(userId);
  if (existing) {
    throw new BusinessAlreadyExistsError();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      user_id: userId,
      name: input.name,
      website: input.website,
      industry: input.industry,
      description: input.description,
      target_audience: input.target_audience,
      tone: input.tone,
    })
    .select(
      "id, user_id, name, website, industry, description, target_audience, tone, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to create business: ${error.message}`);
  }

  return businessSchema.parse(data);
}
