import type Stripe from "stripe";
import {
  creditPacks,
  isCreditPackId,
  isPlanId,
  plans,
  type PlanId,
} from "../config/billing.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getStripe } from "../lib/stripe.js";
import { resolvePlanFromPriceId } from "./billing.js";
import { insertCreditTransaction } from "./credit-transactions.js";
import {
  sendBillingInvoicePaidEmail,
  sendBillingPaymentFailedEmail,
  sendCreditsPurchasedEmail,
  sendSubscriptionCanceledEmail,
} from "./email.js";
import {
  getSubscriptionByCustomerId,
  getSubscriptionForUser,
  normalizePlanId,
  upsertSubscription,
} from "./subscriptions.js";

async function claimWebhookEvent(eventId: string, type: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    id: eventId,
    type,
  });

  if (error) {
    if (error.code === "23505") {
      return false;
    }
    throw new Error(`Failed to claim webhook event: ${error.message}`);
  }

  return true;
}

async function addPurchasedCredits(input: {
  userId: string;
  credits: number;
  referenceId: string;
  feature: string;
}) {
  const inserted = await insertCreditTransaction({
    userId: input.userId,
    amount: input.credits,
    type: "purchase",
    feature: input.feature,
    referenceId: input.referenceId,
  });

  if (!inserted.inserted) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: balance, error: balanceError } = await supabase
    .from("credit_balances")
    .select("purchased_credits")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (balanceError || !balance) {
    throw new Error("Credit balance missing while applying purchase");
  }

  const { error } = await supabase
    .from("credit_balances")
    .update({
      purchased_credits: balance.purchased_credits + input.credits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to apply purchased credits: ${error.message}`);
  }
}

async function resetPlanCredits(input: {
  userId: string;
  credits: number;
  referenceId: string;
  feature: string;
}) {
  const inserted = await insertCreditTransaction({
    userId: input.userId,
    amount: input.credits,
    type: "plan_grant",
    feature: input.feature,
    referenceId: input.referenceId,
  });

  if (!inserted.inserted) {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("credit_balances")
    .update({
      plan_credits: input.credits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to reset plan credits: ${error.message}`);
  }
}

async function resolveUserIdFromCustomer(
  customerId: string | null | undefined,
): Promise<string | null> {
  if (!customerId || typeof customerId !== "string") return null;

  const byCustomer = await getSubscriptionByCustomerId(customerId);
  if (byCustomer) return byCustomer.user_id;

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const userId = customer.metadata?.user_id;
  return userId || null;
}

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (!parentSub) return null;
  return typeof parentSub === "string" ? parentSub : parentSub.id;
}

function getInvoicePriceId(invoice: Stripe.Invoice): string | null {
  const pricing = invoice.lines.data[0]?.pricing?.price_details?.price;
  if (!pricing) return null;
  return typeof pricing === "string" ? pricing : pricing.id;
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  return subscription.items.data[0]?.current_period_end ?? null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

function asPlanId(value: string | null | undefined): PlanId | null {
  if (!value || !isPlanId(value)) return null;
  return value;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId =
    session.metadata?.user_id ||
    session.client_reference_id ||
    (await resolveUserIdFromCustomer(
      typeof session.customer === "string" ? session.customer : session.customer?.id,
    ));

  if (!userId) {
    throw new Error("checkout.session.completed missing user_id");
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (session.mode === "subscription") {
    const plan = asPlanId(session.metadata?.plan) ?? "free";
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    await upsertSubscription({
      userId,
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      plan,
      status: "active",
    });
    return;
  }

  if (session.mode === "payment" && session.metadata?.type === "credits") {
    const packId = session.metadata.pack;
    const creditsFromMeta = Number(session.metadata.credits ?? 0);
    const credits =
      packId && isCreditPackId(packId)
        ? creditPacks[packId].credits
        : creditsFromMeta;

    if (!credits || credits <= 0) {
      throw new Error("Invalid credit pack metadata on checkout session");
    }

    if (customerId) {
      await upsertSubscription({
        userId,
        stripeCustomerId: customerId,
      });
    }

    await addPurchasedCredits({
      userId,
      credits,
      referenceId: `checkout_${session.id}`,
      feature: `credit_pack:${packId ?? "unknown"}`,
    });

    await sendCreditsPurchasedEmail({
      userId,
      credits,
      packLabel:
        packId && isCreditPackId(packId) ? creditPacks[packId].label : undefined,
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  let userId = await resolveUserIdFromCustomer(customerId);

  const stripe = getStripe();
  let subscription: Stripe.Subscription | null = null;

  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    userId = userId || subscription.metadata?.user_id || null;
  }

  if (!userId) {
    return;
  }

  const planFromPrice = resolvePlanFromPriceId(getInvoicePriceId(invoice));
  const planFromMeta = asPlanId(subscription?.metadata?.plan);
  const existingPlan = normalizePlanId((await getSubscriptionForUser(userId))?.plan);
  const planId = planFromPrice ?? planFromMeta ?? existingPlan;

  const periodEnd =
    unixToIso(subscription ? getSubscriptionPeriodEnd(subscription) : null) ||
    unixToIso(invoice.lines.data[0]?.period?.end);

  await upsertSubscription({
    userId,
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: subscriptionId ?? undefined,
    plan: planId,
    status: subscription?.status ?? "active",
    currentPeriodEnd: periodEnd,
  });

  if (planId === "free") {
    return;
  }

  await resetPlanCredits({
    userId,
    credits: plans[planId].monthlyCredits,
    referenceId: `invoice_${invoice.id}`,
    feature: `plan:${planId}`,
  });

  await sendBillingInvoicePaidEmail({
    userId,
    planLabel: plans[planId].name,
    credits: plans[planId].monthlyCredits,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;

  const amountDue =
    typeof invoice.amount_due === "number"
      ? `$${(invoice.amount_due / 100).toFixed(2)}`
      : null;

  await sendBillingPaymentFailedEmail({
    userId,
    amountDue,
    portalHint: "Open Billing in your Evanio dashboard to update your card.",
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    subscription.metadata?.user_id ||
    (await resolveUserIdFromCustomer(customerId));

  if (!userId) {
    throw new Error("customer.subscription.updated missing user_id");
  }

  const plan =
    resolvePlanFromPriceId(getSubscriptionPriceId(subscription)) ??
    asPlanId(subscription.metadata?.plan) ??
    "free";

  await upsertSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodEnd: unixToIso(getSubscriptionPeriodEnd(subscription)),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    subscription.metadata?.user_id ||
    (await resolveUserIdFromCustomer(customerId));

  if (!userId) {
    throw new Error("customer.subscription.deleted missing user_id");
  }

  await upsertSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    plan: "free",
    status: "canceled",
    currentPeriodEnd: unixToIso(getSubscriptionPeriodEnd(subscription)),
  });

  const supabase = getSupabaseAdmin();
  await supabase
    .from("credit_balances")
    .update({
      plan_credits: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  await sendSubscriptionCanceledEmail({ userId });
}

export async function processStripeEvent(event: Stripe.Event): Promise<{
  duplicate: boolean;
}> {
  const claimed = await claimWebhookEvent(event.id, event.type);
  if (!claimed) {
    return { duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
      );
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
      );
      break;
    default:
      break;
  }

  return { duplicate: false };
}
