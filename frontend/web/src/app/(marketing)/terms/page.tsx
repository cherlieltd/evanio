import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company, formatAddress } from "@/config/company";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 11, 2026">
      <h2>1. Who we are</h2>
      <p>
        {company.legalName}, a {company.stateOfFormation} limited liability
        company (“Evanio,” “we,” “us,” or “our”), operates the Evanio website,
        applications, and related services (the “Services”). Our principal
        address is {formatAddress()}.
      </p>

      <h2>2. Agreement to these Terms</h2>
      <p>
        These Terms of Service (“Terms”) govern access to and use of the
        Services. By creating an account or using the Services, you agree to
        these Terms.
      </p>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract to
        use the Services. The Services are intended for businesses and
        professionals in the United States.
      </p>

      <h2>4. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your login
        credentials and for all activity under your account. Provide accurate
        information and notify us promptly of unauthorized use.
      </p>

      <h2>5. Subscriptions, credits, and billing</h2>
      <p>
        Paid plans are billed in advance on a recurring basis unless canceled.
        Monthly plan credits and purchased top-up credits are governed by your
        plan terms and our Refund Policy. Credits have no cash value and are
        non-transferable except as required by law. Billing questions:{" "}
        <a href={`mailto:${company.emails.billing}`}>{company.emails.billing}</a>
        .
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        You agree to use the Services only for lawful marketing and business
        purposes and in accordance with our Acceptable Use Policy. You may not
        misuse the Services, attempt to bypass usage limits, or infringe the
        rights of others.
      </p>

      <h2>7. Customer content and AI outputs</h2>
      <p>
        You retain ownership of content you upload. You grant Evanio a limited
        license to host, process, and display that content as needed to provide
        the Services. AI-generated outputs are provided as-is; you are
        responsible for reviewing outputs before publishing or advertising.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Services, including software, branding, and documentation, are owned
        by {company.legalName} or its licensors. These Terms do not transfer
        ownership of Evanio intellectual property to you.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The Services are provided “as is” and “as available.” To the fullest
        extent permitted by law, Evanio disclaims warranties of merchantability,
        fitness for a particular purpose, and non-infringement. We do not
        guarantee specific marketing results.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {company.legalName} will not be
        liable for indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits, revenue, data, or goodwill. Our
        aggregate liability arising from the Services will not exceed the amounts
        you paid us in the twelve (12) months before the claim.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the Services at any time. We may suspend or terminate
        access for violation of these Terms or to protect the Services and other
        users. Provisions that by nature should survive will survive termination.
      </p>

      <h2>12. Governing law and venue</h2>
      <p>
        These Terms are governed by the laws of the {company.governingLaw},
        without regard to its conflict of law rules.
      </p>
      <p>
        Any dispute will be resolved exclusively in the {company.venue}, and you
        consent to their jurisdiction.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        posted on this page with an updated effective date. Continued use after
        changes become effective constitutes acceptance.
      </p>

      <h2>14. Contact us</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${company.legalEmail}`}>{company.legalEmail}</a>
        <br />
        {company.legalName}, a {company.stateOfFormation} limited liability company
        <br />
        <span className="whitespace-pre-line">
          {formatAddress(company.address, "multi-line")}
        </span>
      </p>
    </LegalPage>
  );
}
