import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company, formatAddress } from "@/config/company";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: "How to request deletion of your Evanio account and data.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion" updated="November 11, 2026">
      <p>
        You may request deletion of your Evanio account and associated personal
        data. This page explains how to submit a request and what we retain when
        required by law.
      </p>

      <h2>1. How to request deletion</h2>
      <p>
        Email{" "}
        <a href={`mailto:${company.emails.hello}`}>{company.emails.hello}</a>{" "}
        from the address on your account with the subject “Data deletion
        request.” Include your account email and business name so we can verify
        ownership.
      </p>

      <h2>2. What we delete</h2>
      <p>
        After verification, we delete or anonymize account profile information,
        business profile content, and generated assets associated with your
        account, subject to the exceptions below.
      </p>

      <h2>3. What we may retain</h2>
      <p>
        We may retain limited records needed for billing, fraud prevention, legal
        compliance, or dispute resolution (for example, transaction identifiers
        processed by Stripe). Retained records are limited to what is reasonably
        necessary for those purposes.
      </p>

      <h2>4. Contact</h2>
      <p>
        Data deletion requests:{" "}
        <a href={`mailto:${company.emails.hello}`}>{company.emails.hello}</a>
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
