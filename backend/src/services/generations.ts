import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";

const generationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(["image", "video", "copy"]),
  prompt: z.string(),
  result_url: z.string().nullable(),
  result_json: z.unknown().nullable().optional(),
  status: z.string(),
  credits_used: z.number().int().nonnegative(),
  created_at: z.string(),
});

export type Generation = z.infer<typeof generationSchema>;
export type GenerationType = Generation["type"];

const generationSelect =
  "id, user_id, type, prompt, result_url, result_json, status, credits_used, created_at";

export async function listGenerationsForUser(
  userId: string,
  options: { limit?: number; type?: GenerationType } = {},
): Promise<Generation[]> {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(options.limit ?? 10, 1), 50);

  let query = supabase
    .from("generations")
    .select(generationSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (options.type) {
    query = query.eq("type", options.type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list generations: ${error.message}`);
  }

  return z.array(generationSchema).parse(data ?? []);
}

export async function getGenerationById(
  id: string,
): Promise<Generation | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generations")
    .select(generationSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load generation: ${error.message}`);
  }

  if (!data) return null;
  return generationSchema.parse(data);
}

export async function createGeneration(input: {
  userId: string;
  type: GenerationType;
  prompt: string;
  status?: string;
  creditsUsed?: number;
  resultUrl?: string | null;
  resultJson?: unknown | null;
}): Promise<Generation> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: input.userId,
      type: input.type,
      prompt: input.prompt,
      status: input.status ?? "pending",
      credits_used: input.creditsUsed ?? 0,
      result_url: input.resultUrl ?? null,
      result_json: input.resultJson ?? null,
    })
    .select(generationSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create generation: ${error.message}`);
  }

  return generationSchema.parse(data);
}

export async function updateGeneration(
  id: string,
  patch: {
    status?: string;
    resultUrl?: string | null;
    resultJson?: unknown | null;
    creditsUsed?: number;
    prompt?: string;
  },
): Promise<Generation> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generations")
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.resultUrl !== undefined ? { result_url: patch.resultUrl } : {}),
      ...(patch.resultJson !== undefined
        ? { result_json: patch.resultJson }
        : {}),
      ...(patch.creditsUsed !== undefined
        ? { credits_used: patch.creditsUsed }
        : {}),
      ...(patch.prompt !== undefined ? { prompt: patch.prompt } : {}),
    })
    .eq("id", id)
    .select(generationSelect)
    .single();

  if (error) {
    throw new Error(`Failed to update generation: ${error.message}`);
  }

  return generationSchema.parse(data);
}
