/**
 * Typed dashboard mock data.
 * Swap `getDashboardData()` to call backend GET /me (+ generations) later.
 */

export type DashboardUser = {
  id: string;
  email: string;
  fullName: string;
  initials: string;
};

export type DashboardBusiness = {
  id: string;
  name: string;
};

export type DashboardPlan = {
  id: string;
  name: string;
  priceLabel: string;
  monthlyCredits: number;
};

export type DashboardCredits = {
  planCredits: number;
  purchasedCredits: number;
  planCreditsUsed: number;
  total: number;
};

export type DashboardGeneration = {
  id: string;
  type: "image" | "video" | "copy" | "logo";
  title: string;
  status: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type DashboardEviMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type DashboardData = {
  user: DashboardUser;
  business: DashboardBusiness;
  plan: DashboardPlan;
  credits: DashboardCredits;
  recentGenerations: DashboardGeneration[];
  eviPreviewMessages: DashboardEviMessage[];
};

export const dashboardMock: DashboardData = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "alex@northwindstudio.com",
    fullName: "Alex Rivera",
    initials: "AR",
  },
  business: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Northwind Studio",
  },
  plan: {
    id: "pro",
    name: "Pro",
    priceLabel: "$149/mo",
    monthlyCredits: 3000,
  },
  credits: {
    planCredits: 2340,
    purchasedCredits: 0,
    planCreditsUsed: 660,
    total: 2340,
  },
  recentGenerations: [
    {
      id: "g1",
      type: "image",
      title: "Image",
      status: "completed",
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "g2",
      type: "video",
      title: "Video",
      status: "processing",
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "g3",
      type: "copy",
      title: "Ad copy",
      status: "completed",
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "g4",
      type: "logo",
      title: "Logo",
      status: "completed",
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    },
  ],
  eviPreviewMessages: [
    {
      id: "m1",
      role: "user",
      content: "Can you help me plan ads for our spring sale?",
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "Absolutely. I can draft headlines, suggest audiences, and outline image and video creatives in your brand style.",
    },
  ],
};

/** Later: replace body with authenticated GET /me (+ related resources). */
export async function getDashboardData(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return dashboardMock;
}
