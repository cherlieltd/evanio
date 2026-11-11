import type { Metadata } from "next";
import { ImagesPageContent } from "@/components/images/images-page";

export const metadata: Metadata = {
  title: "Images",
};

export default function ImagesPage() {
  return <ImagesPageContent />;
}
