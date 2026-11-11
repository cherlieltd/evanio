import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { Section } from "@/components/marketing/section";
import { company, formatAddress } from "@/config/company";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Evanio Technologies LLC for sales, support, or partnership questions.",
};

export default function ContactPage() {
  return (
    <Section
      eyebrow="Contact"
      title="Talk with the Evanio team"
      description="Questions about plans, onboarding, or partnerships—send a note and we will get back to you."
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
        <ContactForm />
        <aside className="space-y-6 lg:pt-2">
          <div>
            <p className="text-sm font-medium text-foreground">Company</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {company.legalName}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {formatAddress(company.address, "multi-line")}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="mt-2 text-sm text-muted-foreground">
              General, sales, and support:{" "}
              <a
                href={`mailto:${company.emails.hello}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {company.emails.hello}
              </a>
              <br />
              Billing:{" "}
              <a
                href={`mailto:${company.emails.billing}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {company.emails.billing}
              </a>
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
