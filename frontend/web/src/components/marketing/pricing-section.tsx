import Link from "next/link";
import { Check } from "lucide-react";
import { company } from "@/config/company";
import { homePricing } from "@/lib/home-content";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-soft py-20 sm:py-24">
      <div className="marketing-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-display text-[36px] text-ink sm:text-[48px]">
            Simple plans. Flexible credits.
          </h2>
          <p className="mt-4 text-base text-body">
            Monthly credits for generations. Upgrade or top up whenever you need
            more.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {homePricing.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6 sm:p-7",
                plan.highlighted
                  ? "border-transparent bg-brand text-white shadow-[0_24px_60px_-30px_rgba(4,120,87,0.55)]"
                  : "border-line bg-white text-ink",
              )}
            >
              {plan.highlighted ? (
                <span className="absolute right-5 top-5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                  BEST VALUE
                </span>
              ) : null}

              <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
              <p
                className={cn(
                  "mt-2 text-sm",
                  plan.highlighted ? "text-white/80" : "text-body",
                )}
              >
                {plan.description}
              </p>

              <p className="mt-6 flex items-end gap-1">
                <span className="font-heading text-5xl font-bold leading-none tracking-tight">
                  ${plan.price}
                </span>
                <span
                  className={cn(
                    "pb-1 text-sm",
                    plan.highlighted ? "text-white/75" : "text-muted-text",
                  )}
                >
                  /mo
                </span>
              </p>

              <p
                className={cn(
                  "mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold",
                  plan.highlighted
                    ? "bg-white/15 text-white"
                    : "bg-chip text-ink-2",
                )}
              >
                {plan.credits}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        plan.highlighted ? "text-white" : "text-brand",
                      )}
                      aria-hidden
                    />
                    <span
                      className={
                        plan.highlighted ? "text-white/90" : "text-body"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={cn(
                  "mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  plan.highlighted
                    ? "bg-white text-brand hover:bg-chip"
                    : "bg-ink text-white hover:bg-ink-2",
                )}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-body">
          Billing questions:{" "}
          <a
            href={`mailto:${company.emails.billing}`}
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            {company.emails.billing}
          </a>
        </p>
      </div>
    </section>
  );
}
