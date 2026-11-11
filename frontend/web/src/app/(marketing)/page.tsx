import { CtaSection } from "@/components/marketing/cta-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ServicesSection } from "@/components/marketing/services-section";
import { StepsSection } from "@/components/marketing/steps-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <StepsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
