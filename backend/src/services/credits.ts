import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";

const creditBalanceSchema = z.object({
  user_id: z.string().uuid(),
  plan_credits: z.number().int().nonnegative(),
  purchased_credits: z.number().int().nonnegative(),
  updated_at: z.string().optional(),
});

export type CreditBalance = z.infer<typeof creditBalanceSchema>;

export class InsufficientCreditsError extends Error {
  constructor(message = "insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export async function getBalance(userId: string): Promise<CreditBalance> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("credit_balances")
    .select("user_id, plan_credits, purchased_credits, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load credit balance: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Credit balance not found for user ${userId}`);
  }

  return creditBalanceSchema.parse(data);
}

export async function deductCredits(
  userId: string,
  amount: number,
  feature: string,
): Promise<CreditBalance> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_feature: feature,
  });

  if (error) {
    if (/insufficient credits/i.test(error.message)) {
      throw new InsufficientCreditsError(error.message);
    }
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  const balance = creditBalanceSchema.parse(data);
  const total = balance.plan_credits + balance.purchased_credits;
  if (total > 0 && total <= 50) {
    void import("./email.js")
      .then(({ sendLowCreditsEmail }) =>
        sendLowCreditsEmail({ userId, total }),
      )
      .catch((err) => console.error("Low credits email failed", err));
  }

  return balance;
}

export async function refundCredits(
  userId: string,
  amount: number,
  feature: string,
  referenceId: string,
): Promise<CreditBalance> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }

  if (!referenceId.trim()) {
    throw new Error("referenceId is required");
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_feature: feature,
    p_reference_id: referenceId,
  });

  if (error) {
    throw new Error(`Failed to refund credits: ${error.message}`);
  }

  return creditBalanceSchema.parse(data);
}
