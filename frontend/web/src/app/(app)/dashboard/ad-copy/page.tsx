import type { Metadata } from "next";
import { AdCopyPageContent } from "@/components/ad-copy/ad-copy-page";

export const metadata: Metadata = {
  title: "Ad Copy",
};

export default function AdCopyPage() {
  return <AdCopyPageContent />;
}
