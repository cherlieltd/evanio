import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { EviChat } from "@/components/evi/evi-chat";

export const metadata: Metadata = {
  title: "Evi Chat",
};

export default function EviChatPage() {
  return (
    <div>
      <PageHeader
        title="Evi Chat"
        description="Plan campaigns, ask marketing questions, and get on-brand advice."
      />
      <EviChat />
    </div>
  );
}
