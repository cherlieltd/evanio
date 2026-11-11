import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";
import type { PlanId } from "../config/billing.js";

const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  plan: z.string(),
  status: z.string(),
  current_period_end: z.string().nullable(),
  created_at: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export async function getSubscriptionForUser(
  userId: string,
): Promise<Subscription | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }

  return data ? subscriptionSchema.parse(data) : null;
}

export async function getSubscriptionByCustomerId(
  customerId: string,
): Promise<Subscription | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
    )
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subscription by customer: ${error.message}`);
  }

  return data ? subscriptionSchema.parse(data) : null;
}

export async function upsertSubscription(input: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: string;
  status?: string;
  currentPeriodEnd?: string | null;
}): Promise<Subscription> {
  const existing = await getSubscriptionForUser(input.userId);
  const supabase = getSupabaseAdmin();

  if (!existing) {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: input.userId,
        stripe_customer_id: input.stripeCustomerId ?? null,
        stripe_subscription_id: input.stripeSubscriptionId ?? null,
        plan: input.plan ?? "free",
        status: input.status ?? "inactive",
        current_period_end: input.currentPeriodEnd ?? null,
      })
      .select(
        "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
      )
      .single();

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }

    return subscriptionSchema.parse(data);
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      stripe_customer_id:
        input.stripeCustomerId === undefined
          ? existing.stripe_customer_id
          : input.stripeCustomerId,
      stripe_subscription_id:
        input.stripeSubscriptionId === undefined
          ? existing.stripe_subscription_id
          : input.stripeSubscriptionId,
      plan: input.plan ?? existing.plan,
      status: input.status ?? existing.status,
      current_period_end:
        input.currentPeriodEnd === undefined
          ? existing.current_period_end
          : input.currentPeriodEnd,
    })
    .eq("user_id", input.userId)
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  return subscriptionSchema.parse(data);
}

export function normalizePlanId(plan: string | null | undefined): PlanId | "free" {
  if (plan === "starter" || plan === "pro" || plan === "business") {
    return plan;
  }
  return "free";
}
