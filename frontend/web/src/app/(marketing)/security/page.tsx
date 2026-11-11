import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Evanio protects your data: encryption in transit, Supabase hosting, Stripe payments, and how to report security issues.",
};

export default function SecurityPage() {
  return (
    <LegalPage title="Security" updated="November 11, 2026">
      <p>
        {company.legalName} takes the security of customer accounts and data
        seriously. This page summarizes the controls we use to protect the
        Evanio platform.
      </p>

      <h2>1. Encryption in transit</h2>
      <p>
        Connections to Evanio are protected with TLS. Traffic between your
        browser, our application servers, and our infrastructure providers is
        encrypted in transit.
      </p>

      <h2>2. Hosting and data storage</h2>
      <p>
        Application data is hosted with Supabase (Postgres, Auth, and Storage).
        Access to production systems is limited to authorized personnel and
        protected with authentication, role-based access, and least-privilege
        practices.
      </p>

      <h2>3. Payments</h2>
      <p>
        Payments are processed by Stripe. Evanio does not store full payment
        card numbers on our servers. Card data is handled by Stripe under their
        PCI-compliant systems.
      </p>

      <h2>4. Access controls</h2>
      <p>
        Customer accounts are protected with authenticated sessions. Admin
        tooling is limited to users with an admin role. We monitor for abuse and
        may suspend accounts that threaten the integrity of the Services.
      </p>

      <h2>5. Reporting a security issue</h2>
      <p>
        If you believe you have found a security vulnerability or have a
        security concern, contact us at{" "}
        <a href={`mailto:${company.emails.hello}`}>{company.emails.hello}</a>.
        Please include enough detail for us to reproduce and investigate the
        issue. Do not include passwords or full card numbers in your report.
      </p>
    </LegalPage>
  );
}
