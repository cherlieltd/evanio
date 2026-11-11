import type { Metadata } from "next";
import { BrandKitPageContent } from "@/components/brand-kit/brand-kit-page";

export const metadata: Metadata = {
  title: "Brand Kit",
};

export default function BrandKitPage() {
  return <BrandKitPageContent />;
}
