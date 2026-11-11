export const homeNav = [
  { href: "/#services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const homeSteps = [
  {
    step: "01",
    badgeClass: "bg-peach text-peach-fg",
    title: "Tell Evi about your business",
    description:
      "Share your offer, audience, and goals. Evi builds a working brief in minutes.",
  },
  {
    step: "02",
    badgeClass: "bg-lavender text-lavender-fg",
    title: "Get your brand kit",
    description:
      "Colors, fonts, tagline, and logo options — locked so every asset stays on-brand.",
  },
  {
    step: "03",
    badgeClass: "bg-sky text-sky-fg",
    title: "Create and publish",
    description:
      "Generate ads, copy, and posts, then schedule or launch without hopping tools.",
  },
] as const;

export const homePricing = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    credits: "500 credits / mo",
    description: "For solo owners testing AI marketing.",
    features: [
      "Evi 2.0 chat",
      "AI ad images & copy",
      "1 brand kit",
      "Basic auto posting",
      "Email support",
    ],
    cta: "Choose Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    credits: "2,000 credits / mo",
    description: "For teams shipping creatives every week.",
    features: [
      "Everything in Starter",
      "AI video ads",
      "Campaign planner",
      "Social auto-reply",
      "Priority support",
    ],
    cta: "Choose Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: 249,
    credits: "6,000 credits / mo",
    description: "For multi-location and high-volume brands.",
    features: [
      "Everything in Pro",
      "Website chat widget",
      "Multiple brand kits",
      "Higher generation limits",
      "Dedicated onboarding",
    ],
    cta: "Choose Business",
    highlighted: false,
  },
] as const;

export const homeFaqs = [
  {
    question: "What is Evi 2.0?",
    answer:
      "Evi 2.0 is Evanio’s AI marketing co-pilot. It learns your business and brand kit, then helps you plan campaigns, write copy, and generate creatives from one chat.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Evanio is built for Meta-first workflows today, with creatives that also export cleanly for Google and organic social. Auto posting and inbox features expand across major networks.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from billing settings whenever you want. You keep access through the end of your current billing period.",
  },
  {
    question: "Will my ads look like everyone else's?",
    answer:
      "No. Every generation pulls from your brand kit — colors, fonts, tone, and logo — so outputs stay specific to your business instead of generic AI defaults.",
  },
] as const;

export const footerLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refunds" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
] as const;
