import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/marketing/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { faqs } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about Evanio plans, credits, cancellations, and security.",
};

export default function FaqPage() {
  return (
    <>
      <Section
        eyebrow="FAQ"
        title="Questions, answered"
        description="Quick answers about the product, credits, and how Evanio Technologies LLC supports customers."
        narrow
      >
        <Accordion className="w-full border-t border-border">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-base font-medium text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      <section className="border-t border-border/70 bg-surface py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-heading text-2xl font-semibold text-ink">
              Still need help?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Our team is happy to talk through your use case.
            </p>
          </div>
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 bg-brand px-5 text-brand-foreground hover:bg-brand/90",
            )}
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
