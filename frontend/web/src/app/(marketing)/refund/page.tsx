import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="November 11, 2026">
      <p>
        This Refund & Cancellation Policy describes how {company.legalName}{" "}
        handles subscription charges, credits, and refund requests for Evanio.
      </p>

      <h2>1. Subscriptions</h2>
      <p>
        Paid plans renew automatically each billing cycle until canceled. You
        can cancel anytime from billing settings. Cancellation stops future
        renewals; you retain access through the end of the current paid period.
      </p>

      <h2>2. Monthly plan credits</h2>
      <p>
        Monthly plan credits are included with your subscription and typically
        reset at the start of each billing cycle. Unused plan credits are not
        refundable for cash and do not roll over unless we expressly state
        otherwise for a promotion.
      </p>

      <h2>3. Credit top-ups</h2>
      <p>
        Purchased credit top-ups are generally non-refundable once the purchase
        is completed, except where required by law or when a top-up fails to
        post to your account due to a verified system error.
      </p>

      <h2>4. Refund requests</h2>
      <p>
        If you believe you were charged in error, contact{" "}
        <a href={`mailto:${company.emails.billing}`}>
          {company.emails.billing}
        </a>{" "}
        within fourteen (14) days of the charge and include your account email,
        invoice or receipt ID, and a brief explanation. We may request
        additional information to investigate.
      </p>

      <h2>5. Discretionary refunds</h2>
      <p>
        Except where legally required, refunds are issued at Evanio’s discretion
        (for example, duplicate charges or confirmed billing errors). Approved
        refunds are returned to the original payment method when possible.
      </p>

      <h2>6. Chargebacks</h2>
      <p>
        Please contact billing before filing a payment dispute so we can help
        resolve the issue. Fraudulent or abusive chargebacks may result in
        account suspension.
      </p>

      <h2>7. Contact</h2>
      <p>
        Billing support:{" "}
        <a href={`mailto:${company.emails.billing}`}>
          {company.emails.billing}
        </a>
        <br />
        {company.legalName}, {company.address.city}, {company.address.state}
      </p>
    </LegalPage>
  );
}
