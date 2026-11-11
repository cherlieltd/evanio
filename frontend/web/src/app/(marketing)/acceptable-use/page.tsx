import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
};

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable Use Policy" updated="November 11, 2026">
      <p>
        This Acceptable Use Policy (“AUP”) applies to all users of services
        provided by {company.legalName}. It complements our Terms of Service.
      </p>

      <h2>1. Permitted use</h2>
      <p>
        You may use Evanio to create and manage legitimate marketing content,
        campaigns, and customer communications for lawful business purposes.
      </p>

      <h2>2. Prohibited content and activities</h2>
      <p>You may not use the Services to:</p>
      <ul>
        <li>Violate applicable laws, advertising rules, or platform policies.</li>
        <li>
          Generate or distribute content that is fraudulent, deceptive, hateful,
          harassing, exploitative, or sexually explicit involving minors.
        </li>
        <li>
          Infringe intellectual property, privacy, or publicity rights of others.
        </li>
        <li>
          Impersonate people or brands, or fabricate endorsements and reviews.
        </li>
        <li>
          Promote illegal products, unlicensed pharmaceuticals, weapons
          restricted by law, or other high-risk prohibited categories.
        </li>
        <li>
          Attempt to scrape, probe, overload, reverse engineer, or disrupt the
          Services or related infrastructure.
        </li>
        <li>
          Bypass credit limits, authentication, or other technical restrictions.
        </li>
        <li>
          Upload malware or use the website chat / auto-reply features for spam
          or social engineering.
        </li>
      </ul>

      <h2>3. Advertising responsibility</h2>
      <p>
        You are responsible for ensuring ads, landing pages, offers, and claims
        comply with FTC guidance and channel requirements (including Meta and
        Google). Evanio does not guarantee approval of ads by third-party
        platforms.
      </p>

      <h2>4. Enforcement</h2>
      <p>
        We may investigate suspected violations and may remove content, suspend
        credits, or terminate accounts. We may report illegal activity to
        authorities when appropriate.
      </p>

      <h2>5. Reporting</h2>
      <p>
        Report suspected abuse to{" "}
        <a href={`mailto:${company.emails.hello}`}>{company.emails.hello}</a>{" "}
        with relevant URLs, screenshots, and account details when available.
      </p>

      <h2>6. Updates</h2>
      <p>
        We may update this AUP as our product and legal requirements evolve.
        Continued use of the Services after an update constitutes acceptance.
      </p>
    </LegalPage>
  );
}
