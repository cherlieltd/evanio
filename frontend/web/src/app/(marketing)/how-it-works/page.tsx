import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { howItWorksSteps, services } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "See how Evanio connects your business, creates with Evi 2.0, and helps you publish and improve.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Section
        eyebrow="How it works"
        title="From setup to shipped campaigns in three steps"
        description="Evanio is built for operators who need marketing output—not another blank dashboard."
      >
        <ol className="space-y-0 border-t border-border">
          {howItWorksSteps.map((item) => (
            <li
              key={item.step}
              className="grid gap-4 border-b border-border py-10 md:grid-cols-[7rem_1fr] md:gap-10"
            >
              <p className="font-heading text-4xl font-semibold text-brand/80">
                {item.step}
              </p>
              <div>
                <h3 className="font-heading text-2xl font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow="Inside the product"
        title="What you can run day to day"
        description="Each capability is available from one workspace, with credits that track your AI usage."
        className="bg-surface border-y border-border/70"
      >
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.name} className="border-l-2 border-brand/40 pl-4">
              <p className="font-medium text-foreground">{service.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-heading text-2xl font-semibold text-ink">
            See plans and monthly credits
          </p>
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 bg-brand px-5 text-brand-foreground hover:bg-brand/90",
            )}
          >
            Compare pricing
          </Link>
        </div>
      </section>
    </>
  );
}
