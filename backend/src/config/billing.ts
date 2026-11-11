export type PlanId = "starter" | "pro" | "business";
export type CreditPackId = "boost" | "growth" | "scale";

export type PlanConfig = {
  id: PlanId;
  name: string;
  amountUsd: number;
  monthlyCredits: number;
  blurb: string;
  features: string[];
  highlighted?: boolean;
  priceEnvKey:
    | "STRIPE_PRICE_STARTER"
    | "STRIPE_PRICE_PRO"
    | "STRIPE_PRICE_BUSINESS";
};

export type CreditPackConfig = {
  id: CreditPackId;
  label: string;
  credits: number;
  amountUsd: number;
  priceEnvKey:
    | "STRIPE_PRICE_CREDITS_BOOST"
    | "STRIPE_PRICE_CREDITS_GROWTH"
    | "STRIPE_PRICE_CREDITS_SCALE";
};

export const plans: Record<PlanId, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    amountUsd: 49,
    monthlyCredits: 500,
    blurb: "For solo owners testing AI-assisted marketing.",
    features: [
      "Evi 2.0 chat",
      "AI ad images & copy",
      "1 brand kit",
      "Basic auto posting",
      "Email support",
    ],
    priceEnvKey: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    amountUsd: 149,
    monthlyCredits: 2000,
    blurb: "For growing teams shipping creatives every week.",
    features: [
      "Everything in Starter",
      "AI video ads",
      "Campaign planner",
      "Social auto-reply",
      "Priority support",
    ],
    highlighted: true,
    priceEnvKey: "STRIPE_PRICE_PRO",
  },
  business: {
    id: "business",
    name: "Business",
    amountUsd: 399,
    monthlyCredits: 6000,
    blurb: "For multi-location and agency-style workloads.",
    features: [
      "Everything in Pro",
      "Website chat widget",
      "Multiple brand kits",
      "Higher generation limits",
      "Dedicated onboarding",
    ],
    priceEnvKey: "STRIPE_PRICE_BUSINESS",
  },
};

export const creditPacks: Record<CreditPackId, CreditPackConfig> = {
  boost: {
    id: "boost",
    label: "Boost",
    credits: 500,
    amountUsd: 29,
    priceEnvKey: "STRIPE_PRICE_CREDITS_BOOST",
  },
  growth: {
    id: "growth",
    label: "Growth",
    credits: 1500,
    amountUsd: 69,
    priceEnvKey: "STRIPE_PRICE_CREDITS_GROWTH",
  },
  scale: {
    id: "scale",
    label: "Scale",
    credits: 5000,
    amountUsd: 199,
    priceEnvKey: "STRIPE_PRICE_CREDITS_SCALE",
  },
};

export function isPlanId(value: string): value is PlanId {
  return value in plans;
}

export function isCreditPackId(value: string): value is CreditPackId {
  return value in creditPacks;
}

export function getPlanPriceId(planId: PlanId): string {
  const key = plans[planId].priceEnvKey;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return priceId;
}

export function getCreditPackPriceId(packId: CreditPackId): string {
  const key = creditPacks[packId].priceEnvKey;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing environment variable ${key}`);
  }
  return priceId;
}

export function getPublicBillingCatalog() {
  return {
    plans: Object.values(plans).map((plan) => ({
      id: plan.id,
      name: plan.name,
      amountUsd: plan.amountUsd,
      monthlyCredits: plan.monthlyCredits,
      blurb: plan.blurb,
      features: plan.features,
      highlighted: Boolean(plan.highlighted),
    })),
    creditPacks: Object.values(creditPacks).map((pack) => ({
      id: pack.id,
      label: pack.label,
      credits: pack.credits,
      amountUsd: pack.amountUsd,
    })),
  };
}
