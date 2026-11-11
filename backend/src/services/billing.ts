import Stripe from "stripe";
import {
  creditPacks,
  getCreditPackPriceId,
  getPlanPriceId,
  getPublicBillingCatalog,
  isCreditPackId,
  isPlanId,
  plans,
  type CreditPackId,
  type PlanId,
} from "../config/billing.js";
import { company } from "../config/company.js";
import { getStripe, getWebOrigin } from "../lib/stripe.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getBalance } from "./credits.js";
import { listCreditTransactions } from "./credit-transactions.js";
import {
  getSubscriptionForUser,
  upsertSubscription,
} from "./subscriptions.js";

export async function getBillingOverview(userId: string) {
  const [subscription, credits, transactions] = await Promise.all([
    getSubscriptionForUser(userId),
    getBalance(userId),
    listCreditTransactions(userId, 30),
  ]);

  return {
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          stripe_customer_id: subscription.stripe_customer_id,
          stripe_subscription_id: subscription.stripe_subscription_id,
        }
      : {
          plan: "free",
          status: "inactive",
          current_period_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        },
    credits: {
      ...credits,
      total: credits.plan_credits + credits.purchased_credits,
    },
    transactions,
    catalog: getPublicBillingCatalog(),
  };
}

async function getProfileEmail(userId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.email) {
    throw new Error("Unable to load profile email for billing");
  }

  return data.email;
}

export async function getOrCreateStripeCustomerId(
  userId: string,
): Promise<string> {
  const existing = await getSubscriptionForUser(userId);
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripe();
  const email = await getProfileEmail(userId);
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await upsertSubscription({
    userId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export async function createSubscriptionCheckoutSession(
  userId: string,
  planId: PlanId,
): Promise<Stripe.Checkout.Session> {
  if (!isPlanId(planId)) {
    throw new Error("Invalid plan");
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomerId(userId);
  const origin = getWebOrigin();
  const priceId = getPlanPriceId(planId);

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?checkout=success`,
    cancel_url: `${origin}/dashboard/billing?checkout=canceled`,
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    customer_update: {
      address: "auto",
      name: "auto",
    },
    tax_id_collection: { enabled: true },
    custom_text: {
      after_submit: {
        message: `Billing questions: ${company.emails.billing}`,
      },
    },
    metadata: {
      user_id: userId,
      plan: planId,
      type: "subscription",
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        plan: planId,
      },
    },
  });
}

export async function createCreditCheckoutSession(
  userId: string,
  packId: CreditPackId,
): Promise<Stripe.Checkout.Session> {
  if (!isCreditPackId(packId)) {
    throw new Error("Invalid credit pack");
  }

  const pack = creditPacks[packId];
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomerId(userId);
  const origin = getWebOrigin();
  const priceId = getCreditPackPriceId(packId);

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?credits=success`,
    cancel_url: `${origin}/dashboard/billing?credits=canceled`,
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    customer_update: {
      address: "auto",
      name: "auto",
    },
    tax_id_collection: { enabled: true },
    custom_text: {
      after_submit: {
        message: `Billing questions: ${company.emails.billing}`,
      },
    },
    metadata: {
      user_id: userId,
      pack: packId,
      type: "credits",
      credits: String(pack.credits),
    },
    payment_intent_data: {
      metadata: {
        user_id: userId,
        pack: packId,
        type: "credits",
        credits: String(pack.credits),
      },
    },
  });
}

export async function createBillingPortalSession(
  userId: string,
): Promise<Stripe.BillingPortal.Session> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this account");
  }

  const stripe = getStripe();
  const origin = getWebOrigin();

  return stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  });
}

export function resolvePlanFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;

  for (const plan of Object.values(plans)) {
    const envPrice = process.env[plan.priceEnvKey];
    if (envPrice && envPrice === priceId) {
      return plan.id;
    }
  }

  return null;
}
