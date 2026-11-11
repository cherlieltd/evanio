"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  checkoutCredits,
  checkoutSubscription,
  getBilling,
  openBillingPortal,
  type BillingOverview,
} from "@/lib/api";
import { company } from "@/config/company";
import { cn } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(amountUsd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}

function transactionLabel(type: string) {
  switch (type) {
    case "purchase":
      return "Credit purchase";
    case "plan_grant":
      return "Plan credits";
    case "deduct":
      return "Usage";
    default:
      return type;
  }
}

export function BillingPageContent() {
  const { refresh } = useMe();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setError(null);
    try {
      const data = await getBilling();
      setBilling(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const credits = searchParams.get("credits");

    if (checkout === "success" || credits === "success") {
      setNotice(
        checkout === "success"
          ? "Subscription checkout completed. Credits update when Stripe confirms payment."
          : "Credit pack checkout completed. Your balance will refresh shortly.",
      );
      void refresh();
      void loadBilling();
    } else if (checkout === "canceled" || credits === "canceled") {
      setNotice("Checkout canceled. No changes were made.");
    }
  }, [searchParams, refresh, loadBilling]);

  async function startSubscriptionCheckout(planId: string) {
    setBusyKey(`plan:${planId}`);
    setError(null);
    try {
      const session = await checkoutSubscription(planId);
      if (!session.url) throw new Error("Checkout URL missing");
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusyKey(null);
    }
  }

  async function startCreditCheckout(packId: string) {
    setBusyKey(`pack:${packId}`);
    setError(null);
    try {
      const session = await checkoutCredits(packId);
      if (!session.url) throw new Error("Checkout URL missing");
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusyKey(null);
    }
  }

  async function openPortal() {
    setBusyKey("portal");
    setError(null);
    try {
      const session = await openBillingPortal();
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open portal");
      setBusyKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading billing...</p>;
  }

  if (!billing) {
    return (
      <p className="text-sm text-destructive">
        {error ?? "Unable to load billing details."}
      </p>
    );
  }

  const currentPlanId = billing.subscription.plan;
  const currentPlan =
    billing.catalog.plans.find((plan) => plan.id === currentPlanId) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <PageHeader
        title="Billing & Credits"
        description="Manage your plan, buy credit packs, and review credit activity."
      />

      {notice ? (
        <p className="border border-brand/30 bg-surface px-4 py-3 text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Current plan</p>
          <p className="mt-2 font-heading text-2xl font-semibold capitalize text-ink">
            {currentPlan?.name ?? currentPlanId}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {billing.subscription.status}
            {billing.subscription.current_period_end
              ? ` · Renews ${formatDate(billing.subscription.current_period_end)}`
              : ""}
          </p>
          {currentPlan ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {currentPlan.monthlyCredits.toLocaleString()} credits / month ·{" "}
              {formatMoney(currentPlan.amountUsd)}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Free plan · upgrade anytime below.
            </p>
          )}
          <Button
            variant="outline"
            className="mt-5"
            disabled={busyKey === "portal" || !billing.subscription.stripe_customer_id}
            onClick={() => void openPortal()}
          >
            {busyKey === "portal" ? "Opening..." : "Manage billing"}
          </Button>
        </div>

        <div className="border border-border bg-background p-5">
          <p className="text-sm text-muted-foreground">Credit balance</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-ink">
            {billing.credits.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {billing.credits.plan_credits.toLocaleString()} plan ·{" "}
            {billing.credits.purchased_credits.toLocaleString()} purchased
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
          Plans
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {billing.catalog.plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col border border-border p-5",
                  plan.highlighted && "border-brand/40 bg-surface",
                )}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-xl font-semibold text-ink">
                      {plan.name}
                    </h3>
                    {isCurrent ? (
                      <span className="text-xs font-medium text-brand">Current</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-4 font-heading text-3xl font-semibold text-ink">
                    {formatMoney(plan.amountUsd)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-brand">
                    {plan.monthlyCredits.toLocaleString()} credits / month
                  </p>
                </div>
                <ul className="mb-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "justify-center",
                    !isCurrent &&
                      "bg-brand text-brand-foreground hover:bg-brand/90",
                  )}
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || busyKey === `plan:${plan.id}`}
                  onClick={() => void startSubscriptionCheckout(plan.id)}
                >
                  {isCurrent
                    ? "Current plan"
                    : busyKey === `plan:${plan.id}`
                      ? "Redirecting..."
                      : currentPlanId === "free"
                        ? "Upgrade"
                        : "Switch plan"}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
          Buy credit packs
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {billing.catalog.creditPacks.map((pack) => (
            <div key={pack.id} className="border border-border p-4">
              <p className="text-sm text-brand">{pack.label}</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-ink">
                {pack.credits.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                credits · {formatMoney(pack.amountUsd)}
              </p>
              <Button
                className="mt-4 w-full justify-center bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={busyKey === `pack:${pack.id}`}
                onClick={() => void startCreditCheckout(pack.id)}
              >
                {busyKey === `pack:${pack.id}` ? "Redirecting..." : "Buy pack"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">
          Transaction history
        </h2>
        {billing.transactions.length === 0 ? (
          <div className="border border-dashed border-border bg-surface px-5 py-8 text-sm text-muted-foreground">
            No credit transactions yet.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {billing.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {transactionLabel(tx.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.feature ?? "—"} · {formatDate(tx.created_at)}
                  </p>
                </div>
                <p
                  className={cn(
                    "font-heading text-sm font-semibold",
                    tx.amount < 0 ? "text-destructive" : "text-brand",
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-border bg-surface px-5 py-4 text-sm text-muted-foreground">
        Billing questions, invoices, refunds, and cancellations:{" "}
        <a
          href={`mailto:${company.emails.billing}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {company.emails.billing}
        </a>
      </section>
    </div>
  );
}
