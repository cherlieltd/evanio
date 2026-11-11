import type { Metadata } from "next";
import { PostCalendarPageContent } from "@/components/social/post-calendar-page";

export const metadata: Metadata = {
  title: "Post Calendar",
};

export default function PostCalendarPage() {
  return <PostCalendarPageContent />;
}
