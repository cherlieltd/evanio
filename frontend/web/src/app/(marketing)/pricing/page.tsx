import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { company } from "@/config/company";
import { creditTopUps, pricingPlans } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Starter, Pro, and Business plans with monthly credits, plus credit top-ups when you need more.",
};

export default function PricingPage() {
  return (
    <>
      <Section
        eyebrow="Pricing"
        title="Simple plans. Credits that scale with you."
        description="Every plan includes monthly credits for generations. Buy top-ups anytime without changing your plan."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col border border-border bg-background p-6 sm:p-7",
                plan.highlighted &&
                  "border-brand/50 bg-surface shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--brand)_55%,transparent)]",
              )}
            >
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-heading text-2xl font-semibold text-ink">
                    {plan.name}
                  </h3>
                  {plan.highlighted ? (
                    <span className="text-xs font-medium tracking-wide text-brand">
                      Most popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-semibold text-ink">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm font-medium text-brand">
                  {plan.credits.toLocaleString()} credits / month
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={cn(
                  buttonVariants({
                    variant: plan.highlighted ? "default" : "outline",
                  }),
                  "h-10 justify-center",
                  plan.highlighted &&
                    "bg-brand text-brand-foreground hover:bg-brand/90",
                )}
              >
                Get started
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Credit top-ups"
        title="Need more generations this month?"
        description="Top-ups are available on any paid plan. Purchased credits are used after your monthly plan credits."
        className="border-y border-border/70 bg-surface"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {creditTopUps.map((pack) => (
            <div
              key={pack.label}
              className="border border-border bg-background px-5 py-6"
            >
              <p className="text-sm font-medium text-brand">{pack.label}</p>
              <p className="mt-2 font-heading text-3xl font-semibold text-ink">
                {pack.credits.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">credits</p>
              <p className="mt-4 text-lg font-medium text-foreground">
                ${pack.price}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">
            Prices shown in USD. Taxes may apply. See our{" "}
            <Link href="/refund" className="text-foreground underline-offset-4 hover:underline">
              Refund Policy
            </Link>{" "}
            for billing details. Billing questions:{" "}
            <a
              href={`mailto:${company.emails.billing}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {company.emails.billing}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
