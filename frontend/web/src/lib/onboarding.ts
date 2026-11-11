export const industries = [
  "Home services",
  "Health & wellness",
  "Retail & ecommerce",
  "Restaurants & food",
  "Professional services",
  "Real estate",
  "Fitness",
  "Beauty & personal care",
  "Education",
  "Other",
] as const;

export const brandTones = [
  "Friendly and approachable",
  "Professional and trusted",
  "Bold and energetic",
  "Warm and local",
  "Premium and polished",
  "Playful and creative",
] as const;

export type OnboardingData = {
  name: string;
  website: string;
  industry: string;
  description: string;
  target_audience: string;
  tone: string;
};

export const emptyOnboardingData: OnboardingData = {
  name: "",
  website: "",
  industry: "",
  description: "",
  target_audience: "",
  tone: "",
};
