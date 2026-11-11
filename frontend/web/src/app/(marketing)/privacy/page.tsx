import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company, formatAddress } from "@/config/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 11, 2026">
      <p>
        This Privacy Policy explains how {company.legalName} (“Evanio,” “we,”
        “us,” or “our”) collects, uses, and shares information when you use our
        websites and services.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          Account information such as name, email address, and business details
          you provide.
        </li>
        <li>
          Billing information processed by our payment provider (we do not store
          full card numbers).
        </li>
        <li>
          Content you upload or generate in the product, including brand assets,
          prompts, and campaign materials.
        </li>
        <li>
          Usage data such as feature interactions, device/browser type, IP
          address, and approximate location.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, maintain, and improve the Services.</li>
        <li>Process subscriptions, credits, and customer support requests.</li>
        <li>Personalize marketing assistance based on your business profile.</li>
        <li>Monitor reliability, prevent abuse, and secure accounts.</li>
        <li>Comply with legal obligations and enforce our Terms.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Prompts and related inputs may be sent to subprocessors that provide
        model inference so we can generate marketing outputs. We instruct
        providers to process data to deliver the Services and improve safety.
        Do not submit sensitive personal information you do not want processed.
      </p>

      <h2>4. How we share information</h2>
      <p>
        We share information with vendors that help us operate the Services
        (hosting, authentication, payments, analytics, and AI providers), when
        required by law, or in connection with a merger or acquisition. We do
        not sell personal information.
      </p>

      <h2>5. Cookies and similar technologies</h2>
      <p>
        We use cookies and similar technologies for authentication, preferences
        (including theme), and analytics. You can control cookies through your
        browser settings; some features may not work if cookies are disabled.
        Cookie questions:{" "}
        <a href={`mailto:${company.emails.hello}`}>{company.emails.hello}</a>.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain account and usage information for as long as needed to provide
        the Services and for legitimate business or legal purposes. You may
        request deletion of your account subject to legal retention requirements.
      </p>

      <h2>7. Security</h2>
      <p>
        We use administrative, technical, and organizational safeguards designed
        to protect information. No method of transmission or storage is 100%
        secure.
      </p>

      <h2>8. Your choices</h2>
      <p>
        You may update account information in the product, opt out of non-essential
        marketing emails, and contact us to request access or deletion where
        applicable under US state privacy laws.
      </p>

      <h2>9. Children</h2>
      <p>
        The Services are not directed to children under 13, and we do not
        knowingly collect personal information from children.
      </p>

      <h2>10. Governing law</h2>
      <p>
        This Privacy Policy is governed by the laws of the {company.governingLaw},
        without regard to its conflict of law rules, except where applicable US
        federal law controls.
      </p>

      <h2>11. Contact us</h2>
      <p>
        Privacy requests:{" "}
        <a href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</a>
        <br />
        {company.legalName}
        <br />
        <span className="whitespace-pre-line">
          {formatAddress(company.address, "multi-line")}
        </span>
      </p>
    </LegalPage>
  );
}
