import type { Metadata } from "next";
import { VideosPageContent } from "@/components/videos/videos-page";

export const metadata: Metadata = {
  title: "Videos",
};

export default function VideosPage() {
  return <VideosPageContent />;
}
