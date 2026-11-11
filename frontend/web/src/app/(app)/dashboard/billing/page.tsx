import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingPageContent } from "@/components/dashboard/billing-page";

export const metadata: Metadata = {
  title: "Billing & Credits",
};

export default function BillingPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading billing...</p>}
    >
      <BillingPageContent />
    </Suspense>
  );
}
