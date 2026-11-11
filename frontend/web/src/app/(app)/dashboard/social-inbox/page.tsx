import type { Metadata } from "next";
import { Suspense } from "react";
import { SocialInboxPageContent } from "@/components/social/social-inbox-page";

export const metadata: Metadata = {
  title: "Social Inbox",
};

export default function SocialInboxPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading inbox...</p>}
    >
      <SocialInboxPageContent />
    </Suspense>
  );
}
