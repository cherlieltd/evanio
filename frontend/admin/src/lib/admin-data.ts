/**
 * Maps live /admin API responses into the shapes used by admin UI pages.
 */
import {
  adjustUserCredits,
  getAdminOverview,
  getAdminUsage,
  getAdminUser,
  getBillingSettings,
  listAdminCredits,
  listAdminSubscriptions,
  listAdminUsers,
  updateBillingSettings,
  apiFetch,
  type AdminUserRow,
} from "@/lib/api";
import type {
  AdminOverview,
  AdminUser,
  CreditCostConfig,
  CreditPackConfig,
  CreditTransaction,
  FeatureUsage,
  GenerationJob,
  PlanConfig,
  SubscriptionStatus,
} from "@/lib/admin-mock";

function mapStatus(status: string | null | undefined): SubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "cancelled") return "canceled";
  return "canceled";
}

function mapPlan(plan: string | null | undefined): AdminUser["plan"] {
  if (plan === "starter" || plan === "pro" || plan === "business") return plan;
  return "starter";
}

function mapUserRow(row: AdminUserRow): AdminUser {
  const profile = row.profile as AdminUserRow["profile"] & {
    suspended?: boolean;
  };
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name ?? profile.email,
    role: profile.role,
    suspended: Boolean(profile.suspended),
    businessName: row.business?.name ?? profile.full_name ?? "Unnamed business",
    industry: row.business?.industry ?? "—",
    website: null,
    plan: mapPlan(row.subscription?.plan),
    status: mapStatus(row.subscription?.status),
    creditsLeft: row.credits?.total ?? 0,
    planCredits: row.credits?.plan_credits ?? 0,
    purchasedCredits: row.credits?.purchased_credits ?? 0,
    stripeCustomerId:
      (row.subscription as { stripe_customer_id?: string | null } | null)
        ?.stripe_customer_id ?? null,
    renewalDate: row.subscription?.current_period_end ?? null,
    createdAt: profile.created_at,
  };
}

function featureLabel(feature: string) {
  const map: Record<string, string> = {
    video_generate: "Video ads",
    image_generate: "Ad images",
    evi_chat: "Evi chat",
    ad_copy_generate: "Ad copy",
    brand_kit_generate: "Brand kit",
    social_auto_reply: "Social auto-reply",
    social_post_publish: "Social publish",
    widget_chat_message: "Chat widget",
  };
  return map[feature] ?? feature.replace(/_/g, " ");
}

export async function loadOverviewPage(): Promise<AdminOverview> {
  const [overview, users, usage] = await Promise.all([
    getAdminOverview(),
    listAdminUsers(),
    getAdminUsage(),
  ]);

  const totalCredits = usage.usage.reduce((sum, row) => sum + row.credits, 0) || 1;
  const featureUsage: FeatureUsage[] = usage.usage.slice(0, 5).map((row) => ({
    feature: featureLabel(row.feature),
    credits: row.credits,
    percent: Math.round((row.credits / totalCredits) * 100),
    aiCostUsd: 0,
  }));

  const mappedUsers = users.users.map(mapUserRow);
  const planCounts = { starter: 0, pro: 0, business: 0 };
  for (const user of mappedUsers) {
    if (user.status === "active" || user.status === "trialing") {
      planCounts[user.plan] += 1;
    }
  }

  return {
    mrr: overview.mrr,
    activeSubscribers: overview.activeSubscriptions,
    planMix: `Starter ${planCounts.starter} · Pro ${planCounts.pro} · Business ${planCounts.business}`,
    creditsUsedToday: overview.creditsUsedToday,
    aiCostTodayUsd: overview.failedGenerations,
    featureUsage:
      featureUsage.length > 0
        ? featureUsage
        : [
            { feature: "Video ads", credits: 0, percent: 0, aiCostUsd: 0 },
            { feature: "Ad images", credits: 0, percent: 0, aiCostUsd: 0 },
            { feature: "Evi chat", credits: 0, percent: 0, aiCostUsd: 0 },
            { feature: "Ad copy", credits: 0, percent: 0, aiCostUsd: 0 },
            { feature: "Brand kit", credits: 0, percent: 0, aiCostUsd: 0 },
          ],
    users: mappedUsers,
  };
}

export async function loadUsersPage(q?: string) {
  const result = await listAdminUsers(q);
  return result.users.map(mapUserRow);
}

export async function loadUserDetail(id: string) {
  const details = await getAdminUser(id);
  const profile = details.profile as typeof details.profile & {
    suspended?: boolean;
  };
  const business = details.business as {
    name?: string;
    industry?: string | null;
    website?: string | null;
  } | null;
  const subscription = details.subscription as {
    plan?: string;
    status?: string;
    current_period_end?: string | null;
    stripe_customer_id?: string | null;
  } | null;

  const user: AdminUser = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name ?? profile.email,
    role: profile.role,
    suspended: Boolean(profile.suspended),
    businessName: business?.name ?? profile.full_name ?? "Unnamed business",
    industry: business?.industry ?? "—",
    website: business?.website ?? null,
    plan: mapPlan(subscription?.plan),
    status: mapStatus(subscription?.status),
    creditsLeft: details.credits?.total ?? 0,
    planCredits: details.credits?.plan_credits ?? 0,
    purchasedCredits: details.credits?.purchased_credits ?? 0,
    stripeCustomerId: subscription?.stripe_customer_id ?? null,
    renewalDate: subscription?.current_period_end ?? null,
    createdAt: profile.created_at,
  };

  const transactions: CreditTransaction[] = details.transactions.map((tx) => ({
    id: tx.id,
    userId: id,
    email: profile.email,
    amount: tx.amount,
    type: tx.type as CreditTransaction["type"],
    feature: tx.feature,
    createdAt: tx.created_at,
  }));

  const generations: GenerationJob[] = details.generations.map((job) => ({
    id: job.id,
    userId: id,
    email: profile.email,
    type: job.type as GenerationJob["type"],
    status: normalizeGenerationStatus(job.status),
    prompt: job.prompt,
    creditsUsed: job.credits_used,
    createdAt: job.created_at,
  }));

  return { user, transactions, generations };
}

function normalizeGenerationStatus(status: string): GenerationJob["status"] {
  if (status === "queued" || status === "pending") return "queued";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  return "failed";
}

export async function loadSubscriptionsPage() {
  const result = await listAdminSubscriptions();
  return result.subscriptions.map((row) => {
    const profile = row.profile;
    return {
      id: row.subscription.user_id,
      email: profile?.email ?? "unknown",
      fullName: profile?.full_name ?? profile?.email ?? "Unknown",
      role: (profile?.role ?? "user") as "user" | "admin",
      suspended: false,
      businessName: profile?.full_name ?? profile?.email ?? "Unknown",
      industry: "—",
      website: null,
      plan: mapPlan(row.subscription.plan),
      status: mapStatus(row.subscription.status),
      creditsLeft: 0,
      planCredits: 0,
      purchasedCredits: 0,
      stripeCustomerId:
        (row.subscription as { stripe_customer_id?: string | null })
          .stripe_customer_id ?? null,
      renewalDate: row.subscription.current_period_end,
      createdAt: row.subscription.created_at,
    } satisfies AdminUser;
  });
}

export async function loadCreditsPage() {
  const result = await listAdminCredits();
  return result.transactions.map(
    (tx): CreditTransaction => ({
      id: tx.id,
      userId: tx.user_id,
      email: tx.email ?? "unknown",
      amount: tx.amount,
      type: tx.type as CreditTransaction["type"],
      feature: tx.feature,
      createdAt: tx.created_at,
    }),
  );
}

export async function loadUsagePage() {
  const result = await getAdminUsage();
  const total = result.usage.reduce((sum, row) => sum + row.credits, 0) || 1;
  const featureUsage: FeatureUsage[] = result.usage.map((row) => ({
    feature: featureLabel(row.feature),
    credits: row.credits,
    percent: Math.round((row.credits / total) * 100),
    aiCostUsd: 0,
  }));

  return {
    series: [] as Array<{
      date: string;
      video: number;
      image: number;
      chat: number;
      copy: number;
      brandKit: number;
    }>,
    featureUsage,
  };
}

export async function loadGenerationsPage(status?: string) {
  const params = new URLSearchParams({ limit: "100" });
  if (status && status !== "all") params.set("status", status);
  const result = await apiFetch<{
    generations: Array<{
      id: string;
      user_id: string;
      email: string | null;
      type: string;
      status: string;
      prompt: string;
      credits_used: number;
      created_at: string;
    }>;
  }>(`/admin/generations?${params.toString()}`);

  return result.generations.map(
    (job): GenerationJob => ({
      id: job.id,
      userId: job.user_id,
      email: job.email ?? "unknown",
      type: job.type as GenerationJob["type"],
      status: normalizeGenerationStatus(job.status),
      prompt: job.prompt,
      creditsUsed: job.credits_used,
      createdAt: job.created_at,
    }),
  );
}

export async function retryGeneration(id: string) {
  return apiFetch<{ generation: unknown }>(`/admin/generations/${id}/retry`, {
    method: "POST",
  });
}

export async function suspendUser(id: string, suspended: boolean) {
  return apiFetch<{ profile: unknown }>(`/admin/users/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ suspended }),
  });
}

export async function adjustCredits(input: {
  userId: string;
  amount: number;
  reason: string;
}) {
  return adjustUserCredits(input.userId, {
    amount: input.amount,
    reason: input.reason,
  });
}

export async function loadSettingsPage(): Promise<{
  plans: PlanConfig[];
  creditPacks: CreditPackConfig[];
  creditCosts: CreditCostConfig[];
}> {
  const settings = await getBillingSettings();
  return {
    plans: settings.effective.plans
      .filter((plan) => ["starter", "pro", "business"].includes(plan.id))
      .map((plan) => ({
        id: plan.id as PlanConfig["id"],
        name: plan.name,
        amountUsd: plan.amountUsd,
        monthlyCredits: plan.monthlyCredits,
        blurb: plan.blurb,
      })),
    creditPacks: settings.effective.creditPacks.map((pack) => ({
      id: pack.id,
      label: pack.label,
      credits: pack.credits,
      amountUsd: pack.amountUsd,
    })),
    creditCosts: (
      (settings as { creditCosts?: CreditCostConfig[] }).creditCosts ?? []
    ).map((row) => ({
      feature: featureLabel(row.feature),
      key: row.key,
      credits: row.credits,
    })),
  };
}

export async function saveSettingsPage(input: {
  plans: PlanConfig[];
  creditPacks: CreditPackConfig[];
}) {
  const plansPayload: Record<
    string,
    Partial<{
      name: string;
      amountUsd: number;
      monthlyCredits: number;
      blurb: string;
    }>
  > = {};
  for (const plan of input.plans) {
    plansPayload[plan.id] = {
      name: plan.name,
      amountUsd: plan.amountUsd,
      monthlyCredits: plan.monthlyCredits,
      blurb: plan.blurb,
    };
  }

  const packsPayload: Record<
    string,
    Partial<{ label: string; credits: number; amountUsd: number }>
  > = {};
  for (const pack of input.creditPacks) {
    packsPayload[pack.id] = {
      label: pack.label,
      credits: pack.credits,
      amountUsd: pack.amountUsd,
    };
  }

  await updateBillingSettings({
    plans: plansPayload,
    creditPacks: packsPayload,
  });
  return loadSettingsPage();
}
