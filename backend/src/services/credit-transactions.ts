import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";

const transactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  amount: z.number().int(),
  type: z.string(),
  feature: z.string().nullable(),
  reference_id: z.string().nullable(),
  created_at: z.string(),
});

export type CreditTransaction = z.infer<typeof transactionSchema>;

export async function listCreditTransactions(
  userId: string,
  limit = 25,
): Promise<CreditTransaction[]> {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, user_id, amount, type, feature, reference_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to list credit transactions: ${error.message}`);
  }

  return z.array(transactionSchema).parse(data ?? []);
}

export async function insertCreditTransaction(input: {
  userId: string;
  amount: number;
  type: string;
  feature?: string | null;
  referenceId?: string | null;
}): Promise<{ inserted: boolean; transaction?: CreditTransaction }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: input.userId,
      amount: input.amount,
      type: input.type,
      feature: input.feature ?? null,
      reference_id: input.referenceId ?? null,
    })
    .select("id, user_id, amount, type, feature, reference_id, created_at")
    .maybeSingle();

  if (error) {
    // Unique reference_id means this grant was already applied.
    if (error.code === "23505") {
      return { inserted: false };
    }
    throw new Error(`Failed to insert credit transaction: ${error.message}`);
  }

  return {
    inserted: true,
    transaction: data ? transactionSchema.parse(data) : undefined,
  };
}
