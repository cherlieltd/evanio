/**
 * Typed admin mock data shaped like future /admin API responses.
 * Replace loaders with authenticated backend calls protected by requireAdmin.
 */

export type AdminDateRange = "7d" | "30d" | "90d";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  suspended: boolean;
  businessName: string;
  industry: string;
  website: string | null;
  plan: "starter" | "pro" | "business";
  status: SubscriptionStatus;
  creditsLeft: number;
  planCredits: number;
  purchasedCredits: number;
  stripeCustomerId: string | null;
  renewalDate: string | null;
  createdAt: string;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  email: string;
  amount: number;
  type: "deduct" | "refund" | "admin_adjust" | "purchase" | "plan_grant";
  feature: string | null;
  createdAt: string;
};

export type GenerationJob = {
  id: string;
  userId: string;
  email: string;
  type: "image" | "video" | "copy";
  status: "queued" | "processing" | "completed" | "failed";
  prompt: string;
  creditsUsed: number;
  createdAt: string;
};

export type FeatureUsage = {
  feature: string;
  credits: number;
  percent: number;
  aiCostUsd: number;
};

export type UsagePoint = {
  date: string;
  video: number;
  image: number;
  chat: number;
  copy: number;
  brandKit: number;
};

export type PlanConfig = {
  id: "starter" | "pro" | "business";
  name: string;
  amountUsd: number;
  monthlyCredits: number;
  blurb: string;
};

export type CreditPackConfig = {
  id: string;
  label: string;
  credits: number;
  amountUsd: number;
};

export type CreditCostConfig = {
  feature: string;
  key: string;
  credits: number;
};

export type AdminOverview = {
  mrr: number;
  activeSubscribers: number;
  planMix: string;
  creditsUsedToday: number;
  aiCostTodayUsd: number;
  featureUsage: FeatureUsage[];
  users: AdminUser[];
};

const users: AdminUser[] = [
  {
    id: "u1",
    email: "alex@northwindstudio.com",
    fullName: "Alex Rivera",
    role: "user",
    suspended: false,
    businessName: "Northwind Studio",
    industry: "Design",
    website: "https://northwindstudio.com",
    plan: "pro",
    status: "active",
    creditsLeft: 1840,
    planCredits: 1840,
    purchasedCredits: 0,
    stripeCustomerId: "cus_northwind",
    renewalDate: "2026-12-01T00:00:00.000Z",
    createdAt: "2026-08-12T00:00:00.000Z",
  },
  {
    id: "u2",
    email: "sam@harborcoffee.co",
    fullName: "Sam Chen",
    role: "user",
    suspended: false,
    businessName: "Harbor Coffee",
    industry: "Food & Beverage",
    website: "https://harborcoffee.co",
    plan: "starter",
    status: "trialing",
    creditsLeft: 320,
    planCredits: 320,
    purchasedCredits: 0,
    stripeCustomerId: "cus_harbor",
    renewalDate: "2026-11-20T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "u3",
    email: "jordan@peakfit.gym",
    fullName: "Jordan Lee",
    role: "user",
    suspended: false,
    businessName: "Peak Fit",
    industry: "Fitness",
    website: null,
    plan: "business",
    status: "past_due",
    creditsLeft: 4100,
    planCredits: 3600,
    purchasedCredits: 500,
    stripeCustomerId: "cus_peakfit",
    renewalDate: "2026-11-05T00:00:00.000Z",
    createdAt: "2026-05-18T00:00:00.000Z",
  },
  {
    id: "u4",
    email: "casey@brightpets.io",
    fullName: "Casey Nguyen",
    role: "user",
    suspended: true,
    businessName: "Bright Pets",
    industry: "Retail",
    website: "https://brightpets.io",
    plan: "pro",
    status: "canceled",
    creditsLeft: 0,
    planCredits: 0,
    purchasedCredits: 0,
    stripeCustomerId: "cus_bright",
    renewalDate: null,
    createdAt: "2026-03-22T00:00:00.000Z",
  },
  ...Array.from({ length: 22 }).map((_, index) => {
    const n = index + 5;
    const plans = ["starter", "pro", "business"] as const;
    const statuses = ["active", "trialing", "past_due", "canceled"] as const;
    const plan = plans[n % 3];
    const status = statuses[n % 4];
    return {
      id: `u${n}`,
      email: `owner${n}@example.com`,
      fullName: `Owner ${n}`,
      role: "user" as const,
      suspended: false,
      businessName: `Business ${n}`,
      industry: "Services",
      website: null,
      plan,
      status,
      creditsLeft: 100 * n,
      planCredits: 100 * n,
      purchasedCredits: 0,
      stripeCustomerId: `cus_${n}`,
      renewalDate: "2026-12-15T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
    };
  }),
];

const transactions: CreditTransaction[] = [
  {
    id: "t1",
    userId: "u1",
    email: "alex@northwindstudio.com",
    amount: -15,
    type: "deduct",
    feature: "video_generate",
    createdAt: "2026-11-11T12:00:00.000Z",
  },
  {
    id: "t2",
    userId: "u1",
    email: "alex@northwindstudio.com",
    amount: -3,
    type: "deduct",
    feature: "image_generate",
    createdAt: "2026-11-11T11:40:00.000Z",
  },
  {
    id: "t3",
    userId: "u2",
    email: "sam@harborcoffee.co",
    amount: -1,
    type: "deduct",
    feature: "evi_chat",
    createdAt: "2026-11-11T10:10:00.000Z",
  },
  {
    id: "t4",
    userId: "u3",
    email: "jordan@peakfit.gym",
    amount: 100,
    type: "admin_adjust",
    feature: "admin:manual",
    createdAt: "2026-11-10T16:00:00.000Z",
  },
  {
    id: "t5",
    userId: "u2",
    email: "sam@harborcoffee.co",
    amount: 15,
    type: "refund",
    feature: "video_generate_refund",
    createdAt: "2026-11-10T09:00:00.000Z",
  },
  {
    id: "t6",
    userId: "u1",
    email: "alex@northwindstudio.com",
    amount: -2,
    type: "deduct",
    feature: "ad_copy_generate",
    createdAt: "2026-11-09T14:20:00.000Z",
  },
  {
    id: "t7",
    userId: "u1",
    email: "alex@northwindstudio.com",
    amount: -8,
    type: "deduct",
    feature: "brand_kit_generate",
    createdAt: "2026-11-08T18:00:00.000Z",
  },
];

const generations: GenerationJob[] = [
  {
    id: "g1",
    userId: "u1",
    email: "alex@northwindstudio.com",
    type: "video",
    status: "failed",
    prompt: "Spring sale reel for Northwind",
    creditsUsed: 15,
    createdAt: "2026-11-11T08:00:00.000Z",
  },
  {
    id: "g2",
    userId: "u2",
    email: "sam@harborcoffee.co",
    type: "image",
    status: "completed",
    prompt: "Latte promo square",
    creditsUsed: 3,
    createdAt: "2026-11-11T07:30:00.000Z",
  },
  {
    id: "g3",
    userId: "u3",
    email: "jordan@peakfit.gym",
    type: "copy",
    status: "completed",
    prompt: "Membership offer headlines",
    creditsUsed: 2,
    createdAt: "2026-11-10T20:00:00.000Z",
  },
  {
    id: "g4",
    userId: "u1",
    email: "alex@northwindstudio.com",
    type: "image",
    status: "processing",
    prompt: "Brand kit lifestyle shot",
    creditsUsed: 3,
    createdAt: "2026-11-11T13:00:00.000Z",
  },
  {
    id: "g5",
    userId: "u2",
    email: "sam@harborcoffee.co",
    type: "video",
    status: "queued",
    prompt: "Morning rush story",
    creditsUsed: 15,
    createdAt: "2026-11-11T13:05:00.000Z",
  },
];

const featureUsage: FeatureUsage[] = [
  { feature: "Video ads", credits: 420, percent: 42, aiCostUsd: 38.5 },
  { feature: "Ad images", credits: 260, percent: 26, aiCostUsd: 12.4 },
  { feature: "Evi chat", credits: 180, percent: 18, aiCostUsd: 6.1 },
  { feature: "Ad copy", credits: 90, percent: 9, aiCostUsd: 3.2 },
  { feature: "Brand kit", credits: 50, percent: 5, aiCostUsd: 4.8 },
];

const usageSeries: UsagePoint[] = Array.from({ length: 14 }).map((_, index) => {
  const day = new Date(Date.UTC(2026, 10, 1 + index));
  return {
    date: day.toISOString().slice(0, 10),
    video: 20 + (index % 5) * 8,
    image: 30 + (index % 4) * 6,
    chat: 40 + (index % 6) * 4,
    copy: 10 + (index % 3) * 5,
    brandKit: 4 + (index % 2) * 3,
  };
});

let plans: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    amountUsd: 49,
    monthlyCredits: 500,
    blurb: "For solo owners testing AI-assisted marketing.",
  },
  {
    id: "pro",
    name: "Pro",
    amountUsd: 149,
    monthlyCredits: 2000,
    blurb: "For growing teams shipping creatives every week.",
  },
  {
    id: "business",
    name: "Business",
    amountUsd: 399,
    monthlyCredits: 6000,
    blurb: "For multi-location and agency-style workloads.",
  },
];

let creditPacks: CreditPackConfig[] = [
  { id: "boost", label: "Boost", credits: 500, amountUsd: 29 },
  { id: "growth", label: "Growth", credits: 1500, amountUsd: 69 },
  { id: "scale", label: "Scale", credits: 5000, amountUsd: 199 },
];

let creditCosts: CreditCostConfig[] = [
  { feature: "Evi chat message", key: "eviChatMessage", credits: 1 },
  { feature: "Brand kit generate", key: "brandKitGenerate", credits: 8 },
  { feature: "Image generate", key: "imageGenerate", credits: 3 },
  { feature: "Ad copy generate", key: "adCopyGenerate", credits: 2 },
  { feature: "Video generate", key: "videoGenerate", credits: 15 },
  { feature: "Social auto-reply", key: "socialAutoReply", credits: 1 },
  { feature: "Social post publish", key: "socialPostPublish", credits: 1 },
  { feature: "Widget chat message", key: "widgetChatMessage", credits: 1 },
];

function delay(ms = 220) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAdminOverviewMock(
  _range: AdminDateRange = "30d",
): Promise<AdminOverview> {
  await delay();
  return {
    mrr: 18420,
    activeSubscribers: 126,
    planMix: "Starter · Pro · Business",
    creditsUsedToday: 842,
    aiCostTodayUsd: 64.9,
    featureUsage,
    users,
  };
}

export async function listAdminUsersMock(): Promise<AdminUser[]> {
  await delay();
  return users;
}

export async function getAdminUserMock(id: string): Promise<AdminUser | null> {
  await delay();
  return users.find((user) => user.id === id) ?? null;
}

export async function listCreditTransactionsMock(): Promise<CreditTransaction[]> {
  await delay();
  return transactions;
}

export async function listSubscriptionsMock(): Promise<AdminUser[]> {
  await delay();
  return users.filter((user) => user.stripeCustomerId);
}

export async function listGenerationsMock(): Promise<GenerationJob[]> {
  await delay();
  return generations;
}

export async function getUsageMock(): Promise<{
  series: UsagePoint[];
  featureUsage: FeatureUsage[];
}> {
  await delay();
  return { series: usageSeries, featureUsage };
}

export async function getSettingsMock(): Promise<{
  plans: PlanConfig[];
  creditPacks: CreditPackConfig[];
  creditCosts: CreditCostConfig[];
}> {
  await delay();
  return {
    plans: structuredClone(plans),
    creditPacks: structuredClone(creditPacks),
    creditCosts: structuredClone(creditCosts),
  };
}

export async function saveSettingsMock(input: {
  plans: PlanConfig[];
  creditPacks: CreditPackConfig[];
  creditCosts: CreditCostConfig[];
}) {
  await delay();
  plans = structuredClone(input.plans);
  creditPacks = structuredClone(input.creditPacks);
  creditCosts = structuredClone(input.creditCosts);
  return getSettingsMock();
}

export async function adjustCreditsMock(input: {
  userId: string;
  amount: number;
  reason: string;
}) {
  await delay();
  const user = users.find((row) => row.id === input.userId);
  if (!user) throw new Error("User not found");
  user.creditsLeft += input.amount;
  if (input.amount > 0) user.purchasedCredits += input.amount;
  transactions.unshift({
    id: `t_${Date.now()}`,
    userId: user.id,
    email: user.email,
    amount: input.amount,
    type: "admin_adjust",
    feature: `admin:${input.reason}`,
    createdAt: new Date().toISOString(),
  });
  return user;
}

export async function suspendUserMock(userId: string, suspended: boolean) {
  await delay();
  const user = users.find((row) => row.id === userId);
  if (!user) throw new Error("User not found");
  user.suspended = suspended;
  return user;
}

export async function retryGenerationMock(id: string) {
  await delay();
  const job = generations.find((row) => row.id === id);
  if (!job) throw new Error("Generation not found");
  job.status = "queued";
  return job;
}
