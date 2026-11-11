import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getPublicBillingCatalog,
  isCreditPackId,
  isPlanId,
  plans as defaultPlans,
  creditPacks as defaultPacks,
  type CreditPackId,
  type PlanId,
} from "../config/billing.js";
import { CREDIT_COSTS } from "../config/credits.js";
import { getVideoQueue } from "../queues/video-queue.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { InsufficientCreditsError, type CreditBalance } from "./credits.js";
import {
  getGenerationById,
  updateGeneration,
} from "./generations.js";

const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  full_name: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  suspended: z.boolean().optional().default(false),
  created_at: z.string(),
});

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

const creditBalanceSchema = z.object({
  user_id: z.string().uuid(),
  plan_credits: z.number().int(),
  purchased_credits: z.number().int(),
  updated_at: z.string().optional(),
});

const generationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(["image", "video", "copy"]),
  prompt: z.string(),
  result_url: z.string().nullable(),
  result_json: z.unknown().nullable().optional(),
  status: z.string(),
  credits_used: z.number().int(),
  created_at: z.string(),
});

const creditTxSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  amount: z.number().int(),
  type: z.string(),
  feature: z.string().nullable(),
  reference_id: z.string().nullable(),
  created_at: z.string(),
});

const planOverrideSchema = z.object({
  amountUsd: z.number().positive().optional(),
  monthlyCredits: z.number().int().positive().optional(),
  blurb: z.string().trim().min(1).max(280).optional(),
  features: z.array(z.string().trim().min(1)).min(1).max(12).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  highlighted: z.boolean().optional(),
});

const packOverrideSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  credits: z.number().int().positive().optional(),
  amountUsd: z.number().positive().optional(),
});

export const billingSettingsUpdateSchema = z.object({
  plans: z
    .record(z.string(), planOverrideSchema)
    .optional(),
  creditPacks: z
    .record(z.string(), packOverrideSchema)
    .optional(),
});

function startOfUtcDay(date = new Date()): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}

function planAmount(plan: string): number {
  if (isPlanId(plan)) return defaultPlans[plan].amountUsd;
  return 0;
}

export async function getAdminOverview() {
  const supabase = getSupabaseAdmin();
  const todayStart = startOfUtcDay();

  const [
    usersCount,
    subscriptionsResult,
    creditsTodayResult,
    failedGenerationsCount,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("plan, status")
      .in("status", ["active", "trialing"]),
    supabase
      .from("credit_transactions")
      .select("amount, type")
      .gte("created_at", todayStart)
      .eq("type", "deduct"),
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  if (usersCount.error) {
    throw new Error(`Failed to count users: ${usersCount.error.message}`);
  }
  if (subscriptionsResult.error) {
    throw new Error(
      `Failed to load subscriptions: ${subscriptionsResult.error.message}`,
    );
  }
  if (creditsTodayResult.error) {
    throw new Error(
      `Failed to load credit usage: ${creditsTodayResult.error.message}`,
    );
  }
  if (failedGenerationsCount.error) {
    throw new Error(
      `Failed to count failed generations: ${failedGenerationsCount.error.message}`,
    );
  }

  const mrr = (subscriptionsResult.data ?? []).reduce(
    (sum, row) => sum + planAmount(row.plan),
    0,
  );

  const creditsUsedToday = (creditsTodayResult.data ?? []).reduce(
    (sum, row) => sum + Math.abs(row.amount),
    0,
  );

  return {
    users: usersCount.count ?? 0,
    activeSubscriptions: subscriptionsResult.data?.length ?? 0,
    mrr,
    creditsUsedToday,
    failedGenerations: failedGenerationsCount.count ?? 0,
  };
}

export async function listAdminUsers(input: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, suspended, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.q?.trim()) {
    const term = input.q.trim().replace(/[%_,]/g, " ");
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const profiles = z.array(profileSchema).parse(data ?? []);
  const ids = profiles.map((p) => p.id);

  const [creditsResult, subsResult, businessesResult] = await Promise.all([
    ids.length
      ? supabase
          .from("credit_balances")
          .select("user_id, plan_credits, purchased_credits, updated_at")
          .in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("subscriptions")
          .select(
            "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
          )
          .in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("businesses")
          .select("id, user_id, name, industry, created_at")
          .in("user_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (creditsResult.error) {
    throw new Error(`Failed to load credits: ${creditsResult.error.message}`);
  }
  if (subsResult.error) {
    throw new Error(`Failed to load subscriptions: ${subsResult.error.message}`);
  }
  if (businessesResult.error) {
    throw new Error(
      `Failed to load businesses: ${businessesResult.error.message}`,
    );
  }

  const creditsByUser = new Map(
    (creditsResult.data ?? []).map((row) => [
      row.user_id,
      creditBalanceSchema.parse(row),
    ]),
  );
  const subsByUser = new Map(
    (subsResult.data ?? []).map((row) => [
      row.user_id,
      subscriptionSchema.parse(row),
    ]),
  );
  const businessByUser = new Map(
    (businessesResult.data ?? []).map((row) => [row.user_id, row]),
  );

  return {
    total: count ?? profiles.length,
    users: profiles.map((profile) => {
      const credits = creditsByUser.get(profile.id);
      return {
        profile,
        business: businessByUser.get(profile.id) ?? null,
        subscription: subsByUser.get(profile.id) ?? null,
        credits: credits
          ? {
              ...credits,
              total: credits.plan_credits + credits.purchased_credits,
            }
          : null,
      };
    }),
  };
}

export async function getAdminUserDetails(userId: string) {
  const supabase = getSupabaseAdmin();

  const [profileResult, businessResult, creditsResult, subResult, txsResult, gensResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, role, suspended, created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("businesses")
        .select(
          "id, user_id, name, website, industry, description, target_audience, tone, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("credit_balances")
        .select("user_id, plan_credits, purchased_credits, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select(
          "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("credit_transactions")
        .select(
          "id, user_id, amount, type, feature, reference_id, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("generations")
        .select(
          "id, user_id, type, prompt, result_url, result_json, status, credits_used, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }
  if (!profileResult.data) {
    throw new Error("User not found");
  }

  if (businessResult.error) {
    throw new Error(`Failed to load business: ${businessResult.error.message}`);
  }
  if (creditsResult.error) {
    throw new Error(`Failed to load credits: ${creditsResult.error.message}`);
  }
  if (subResult.error) {
    throw new Error(`Failed to load subscription: ${subResult.error.message}`);
  }
  if (txsResult.error) {
    throw new Error(`Failed to load transactions: ${txsResult.error.message}`);
  }
  if (gensResult.error) {
    throw new Error(`Failed to load generations: ${gensResult.error.message}`);
  }

  const credits = creditsResult.data
    ? creditBalanceSchema.parse(creditsResult.data)
    : null;

  return {
    profile: profileSchema.parse(profileResult.data),
    business: businessResult.data
      ? businessSchema.parse(businessResult.data)
      : null,
    subscription: subResult.data
      ? subscriptionSchema.parse(subResult.data)
      : null,
    credits: credits
      ? {
          ...credits,
          total: credits.plan_credits + credits.purchased_credits,
        }
      : null,
    transactions: z.array(creditTxSchema).parse(txsResult.data ?? []),
    generations: z.array(generationSchema).parse(gensResult.data ?? []),
  };
}

export async function adminAdjustUserCredits(input: {
  userId: string;
  amount: number;
  reason: string;
  adminId: string;
}): Promise<CreditBalance & { total: number }> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new Error("amount must be a non-zero integer");
  }

  const supabase = getSupabaseAdmin();
  const referenceId = `admin_adjust_${randomUUID()}`;
  const feature = `admin:${input.adminId}:${input.reason}`.slice(0, 200);

  const { data, error } = await supabase.rpc("admin_adjust_credits", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_feature: feature,
    p_reference_id: referenceId,
  });

  if (error) {
    if (/insufficient credits/i.test(error.message)) {
      throw new InsufficientCreditsError(error.message);
    }
    throw new Error(`Failed to adjust credits: ${error.message}`);
  }

  const balance = creditBalanceSchema.parse(data);
  return {
    ...balance,
    total: balance.plan_credits + balance.purchased_credits,
  };
}

export async function listAdminSubscriptions(limit = 100) {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to list subscriptions: ${error.message}`);
  }

  const subscriptions = z.array(subscriptionSchema).parse(data ?? []);
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

  const profilesResult = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name, role, suspended, created_at")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error(
      `Failed to load subscription profiles: ${profilesResult.error.message}`,
    );
  }

  const profiles = new Map(
    z
      .array(profileSchema)
      .parse(profilesResult.data ?? [])
      .map((p) => [p.id, p]),
  );

  const active = subscriptions.filter((s) =>
    ["active", "trialing"].includes(s.status),
  );
  const mrr = active.reduce((sum, s) => sum + planAmount(s.plan), 0);

  return {
    mrr,
    activeCount: active.length,
    subscriptions: subscriptions.map((subscription) => ({
      subscription,
      profile: profiles.get(subscription.user_id) ?? null,
      amountUsd: planAmount(subscription.plan),
    })),
  };
}

export async function getAdminUsage() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("amount, type, feature, created_at")
    .eq("type", "deduct")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    throw new Error(`Failed to load usage: ${error.message}`);
  }

  const byFeature = new Map<string, { credits: number; count: number }>();
  for (const row of data ?? []) {
    const feature = row.feature?.trim() || "unknown";
    const current = byFeature.get(feature) ?? { credits: 0, count: 0 };
    current.credits += Math.abs(row.amount);
    current.count += 1;
    byFeature.set(feature, current);
  }

  const usage = [...byFeature.entries()]
    .map(([feature, stats]) => ({ feature, ...stats }))
    .sort((a, b) => b.credits - a.credits);

  return { usage };
}

export async function listFailedGenerations(limit = 50) {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const { data, error } = await supabase
    .from("generations")
    .select(
      "id, user_id, type, prompt, result_url, result_json, status, credits_used, created_at",
    )
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to list failed generations: ${error.message}`);
  }

  return { generations: z.array(generationSchema).parse(data ?? []) };
}

export async function listAdminCreditTransactions(limit = 100) {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, user_id, amount, type, feature, reference_id, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to list credit transactions: ${error.message}`);
  }

  const transactions = z.array(creditTxSchema).parse(data ?? []);
  const userIds = [...new Set(transactions.map((t) => t.user_id))];

  const profilesResult = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error(
      `Failed to load transaction profiles: ${profilesResult.error.message}`,
    );
  }

  const profiles = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p]),
  );

  return {
    transactions: transactions.map((tx) => ({
      ...tx,
      email: profiles.get(tx.user_id)?.email ?? null,
      full_name: profiles.get(tx.user_id)?.full_name ?? null,
    })),
  };
}

type BillingOverrides = {
  plans?: Partial<
    Record<
      PlanId,
      {
        amountUsd?: number;
        monthlyCredits?: number;
        blurb?: string;
        features?: string[];
        name?: string;
        highlighted?: boolean;
      }
    >
  >;
  creditPacks?: Partial<
    Record<
      CreditPackId,
      {
        label?: string;
        credits?: number;
        amountUsd?: number;
      }
    >
  >;
};

async function loadBillingOverrides(): Promise<BillingOverrides> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "billing_catalog")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load billing settings: ${error.message}`);
  }

  if (!data?.value) return {};
  return data.value as BillingOverrides;
}

export async function getAdminBillingSettings() {
  const overrides = await loadBillingOverrides();
  const catalog = getPublicBillingCatalog();

  return {
    defaults: catalog,
    overrides,
    effective: {
      plans: catalog.plans.map((plan) => ({
        ...plan,
        ...(overrides.plans?.[plan.id as PlanId] ?? {}),
      })),
      creditPacks: catalog.creditPacks.map((pack) => ({
        ...pack,
        ...(overrides.creditPacks?.[pack.id as CreditPackId] ?? {}),
      })),
    },
    creditCosts: Object.entries(CREDIT_COSTS).map(([key, credits]) => ({
      key,
      feature: key,
      credits,
    })),
  };
}

export async function updateAdminBillingSettings(
  input: z.infer<typeof billingSettingsUpdateSchema>,
  adminId: string,
) {
  const current = await loadBillingOverrides();
  const next: BillingOverrides = {
    plans: { ...(current.plans ?? {}) },
    creditPacks: { ...(current.creditPacks ?? {}) },
  };

  if (input.plans) {
    for (const [id, patch] of Object.entries(input.plans)) {
      if (!isPlanId(id)) {
        throw new Error(`Unknown plan id: ${id}`);
      }
      next.plans![id] = {
        ...(next.plans![id] ?? {}),
        ...patch,
      };
    }
  }

  if (input.creditPacks) {
    for (const [id, patch] of Object.entries(input.creditPacks)) {
      if (!isCreditPackId(id)) {
        throw new Error(`Unknown credit pack id: ${id}`);
      }
      next.creditPacks![id] = {
        ...(next.creditPacks![id] ?? {}),
        ...patch,
      };
    }
  }

  // Keep only known keys
  for (const id of Object.keys(next.plans ?? {})) {
    if (!isPlanId(id)) delete next.plans![id as PlanId];
  }
  for (const id of Object.keys(next.creditPacks ?? {})) {
    if (!isCreditPackId(id)) delete next.creditPacks![id as CreditPackId];
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "billing_catalog",
      value: next,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`Failed to save billing settings: ${error.message}`);
  }

  // Also patch in-memory defaults used for MRR display / catalog response
  for (const [id, patch] of Object.entries(next.plans ?? {})) {
    if (!isPlanId(id)) continue;
    if (patch.amountUsd != null) defaultPlans[id].amountUsd = patch.amountUsd;
    if (patch.monthlyCredits != null) {
      defaultPlans[id].monthlyCredits = patch.monthlyCredits;
    }
    if (patch.blurb != null) defaultPlans[id].blurb = patch.blurb;
    if (patch.features != null) defaultPlans[id].features = patch.features;
    if (patch.name != null) defaultPlans[id].name = patch.name;
    if (patch.highlighted != null) defaultPlans[id].highlighted = patch.highlighted;
  }

  for (const [id, patch] of Object.entries(next.creditPacks ?? {})) {
    if (!isCreditPackId(id)) continue;
    if (patch.label != null) defaultPacks[id].label = patch.label;
    if (patch.credits != null) defaultPacks[id].credits = patch.credits;
    if (patch.amountUsd != null) defaultPacks[id].amountUsd = patch.amountUsd;
  }

  return getAdminBillingSettings();
}

export async function hydrateBillingOverridesFromDb() {
  try {
    const overrides = await loadBillingOverrides();
    for (const [id, patch] of Object.entries(overrides.plans ?? {})) {
      if (!isPlanId(id) || !patch) continue;
      if (patch.amountUsd != null) defaultPlans[id].amountUsd = patch.amountUsd;
      if (patch.monthlyCredits != null) {
        defaultPlans[id].monthlyCredits = patch.monthlyCredits;
      }
      if (patch.blurb != null) defaultPlans[id].blurb = patch.blurb;
      if (patch.features != null) defaultPlans[id].features = patch.features;
      if (patch.name != null) defaultPlans[id].name = patch.name;
      if (patch.highlighted != null) {
        defaultPlans[id].highlighted = patch.highlighted;
      }
    }
    for (const [id, patch] of Object.entries(overrides.creditPacks ?? {})) {
      if (!isCreditPackId(id) || !patch) continue;
      if (patch.label != null) defaultPacks[id].label = patch.label;
      if (patch.credits != null) defaultPacks[id].credits = patch.credits;
      if (patch.amountUsd != null) defaultPacks[id].amountUsd = patch.amountUsd;
    }
  } catch (error) {
    console.warn("Failed to hydrate billing overrides", error);
  }
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update({ suspended })
    .eq("id", userId)
    .select("id, email, full_name, role, suspended, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to update suspension: ${error.message}`);
  }

  return profileSchema.parse(data);
}

export async function listAdminGenerations(input: {
  status?: string;
  limit?: number;
}) {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 200);

  let query = supabase
    .from("generations")
    .select(
      "id, user_id, type, prompt, result_url, result_json, status, credits_used, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list generations: ${error.message}`);
  }

  const generations = z.array(generationSchema).parse(data ?? []);
  const userIds = [...new Set(generations.map((g) => g.user_id))];
  const profilesResult = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error(
      `Failed to load generation profiles: ${profilesResult.error.message}`,
    );
  }

  const emails = new Map(
    (profilesResult.data ?? []).map((row) => [row.id, row.email as string]),
  );

  return {
    generations: generations.map((generation) => ({
      ...generation,
      email: emails.get(generation.user_id) ?? null,
    })),
  };
}

export async function retryFailedGeneration(generationId: string) {
  const generation = await getGenerationById(generationId);
  if (!generation) {
    throw new Error("Generation not found");
  }
  if (generation.status !== "failed") {
    throw new Error("Only failed generations can be retried");
  }
  if (generation.type !== "video") {
    throw new Error("Admin retry currently supports video jobs only");
  }

  const meta =
    generation.result_json &&
    typeof generation.result_json === "object" &&
    !Array.isArray(generation.result_json)
      ? (generation.result_json as Record<string, unknown>)
      : {};

  const size =
    typeof meta.size === "string"
      ? (meta.size as
          | "720x1280"
          | "1280x720"
          | "1024x1792"
          | "1792x1024")
      : "720x1280";
  const seconds =
    meta.seconds === "4" || meta.seconds === "8" || meta.seconds === "12"
      ? meta.seconds
      : "8";

  await updateGeneration(generationId, {
    status: "queued",
    resultJson: {
      size,
      seconds,
      retriedAt: new Date().toISOString(),
    },
  });

  const queue = getVideoQueue();
  await queue.add(
    "generate-video",
    {
      generationId: generation.id,
      userId: generation.user_id,
      prompt: generation.prompt,
      size,
      seconds,
      // Already refunded on failure; admin retry does not charge again.
      creditsUsed: 0,
    },
    {
      jobId: `${generation.id}_retry_${Date.now()}`,
    },
  );

  return getGenerationById(generationId);
}
