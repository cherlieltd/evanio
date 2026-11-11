import type { Metadata } from "next";
import { ChatWidgetPageContent } from "@/components/chat-widget/chat-widget-page";

export const metadata: Metadata = {
  title: "Chat Widget",
};

export default function ChatWidgetPage() {
  return <ChatWidgetPageContent />;
}
