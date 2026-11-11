export const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const services = [
  {
    name: "Evi 2.0 chat",
    description:
      "Your always-on marketing co-pilot for strategy, creative briefs, and campaign decisions.",
  },
  {
    name: "AI ad images",
    description:
      "Generate on-brand still ads for Meta, Google, and social in minutes—not design sprints.",
  },
  {
    name: "AI video ads",
    description:
      "Turn product shots and offers into short-form video creatives ready to test and scale.",
  },
  {
    name: "Ad copy & campaign planner",
    description:
      "Hooks, headlines, and full campaign outlines tuned to your audience and offer.",
  },
  {
    name: "Brand kit",
    description:
      "Lock colors, fonts, tone, and logo rules so every asset stays unmistakably yours.",
  },
  {
    name: "Auto posting",
    description:
      "Schedule and publish across connected channels without hopping between tools.",
  },
  {
    name: "Social auto-reply",
    description:
      "Respond to common comments and DMs with on-brand replies while you stay in control.",
  },
  {
    name: "Website chat widget",
    description:
      "Put Evi on your site to qualify leads, answer FAQs, and capture contact info.",
  },
] as const;

export const howItWorksSteps = [
  {
    step: "01",
    title: "Connect your business",
    description:
      "Add your website, offer, and audience. Evanio builds a working brand kit and baseline strategy.",
  },
  {
    step: "02",
    title: "Create with Evi",
    description:
      "Chat with Evi 2.0 to generate images, video, copy, and campaign plans that match your tone.",
  },
  {
    step: "03",
    title: "Publish and improve",
    description:
      "Schedule posts, launch ads, and let auto-reply plus your site widget keep conversations moving.",
  },
] as const;

export const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    blurb: "For solo owners testing AI-assisted marketing.",
    credits: 500,
    features: [
      "Evi 2.0 chat",
      "AI ad images & copy",
      "1 brand kit",
      "Basic auto posting",
      "Email support",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    blurb: "For growing teams shipping creatives every week.",
    credits: 2000,
    features: [
      "Everything in Starter",
      "AI video ads",
      "Campaign planner",
      "Social auto-reply",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: 399,
    blurb: "For multi-location and agency-style workloads.",
    credits: 6000,
    features: [
      "Everything in Pro",
      "Website chat widget",
      "Multiple brand kits",
      "Higher generation limits",
      "Dedicated onboarding",
    ],
    highlighted: false,
  },
] as const;

export const creditTopUps = [
  { credits: 500, price: 29, label: "Boost" },
  { credits: 1500, price: 69, label: "Growth" },
  { credits: 5000, price: 199, label: "Scale" },
] as const;

export const faqs = [
  {
    question: "What is Evanio?",
    answer:
      "Evanio is an AI marketing platform for US small businesses. It helps you plan campaigns, generate creatives, post to social, and talk to customers—without hiring a full marketing team.",
  },
  {
    question: "How do credits work?",
    answer:
      "Each plan includes monthly credits used for AI generations (images, video, copy, and certain chat actions). Unused plan credits reset each billing cycle. Purchased top-up credits do not expire while your account is active.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel from your billing settings. You keep access through the end of your current billing period. See our Refund Policy for details on refunds.",
  },
  {
    question: "Do I need design experience?",
    answer:
      "No. Evi 2.0 guides you with prompts, brand-kit defaults, and campaign templates so you can ship usable marketing assets quickly.",
  },
  {
    question: "Which channels does Evanio support?",
    answer:
      "Evanio is built for Meta-first workflows today, with auto posting and social reply features expanding across major social networks. Ad creatives export for Meta, Google, and organic social.",
  },
  {
    question: "Is my data secure?",
    answer:
      "We use encrypted connections, role-based access, and industry-standard providers for auth and storage. Read our Privacy Policy for how Evanio Technologies LLC handles your information.",
  },
] as const;
