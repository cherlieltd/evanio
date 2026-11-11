import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getBalance, type CreditBalance } from "./credits.js";
import { getSubscriptionForUser } from "./subscriptions.js";

const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  full_name: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  created_at: z.string(),
});

const businessSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  target_audience: z.string().nullable(),
  tone: z.string().nullable(),
  created_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;
export type Business = z.infer<typeof businessSchema>;

export type MeResponse = {
  profile: Profile;
  business: Business | null;
  credits: CreditBalance & { total: number };
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
  };
};

export async function getMe(userId: string): Promise<MeResponse> {
  const supabase = getSupabaseAdmin();

  const [profileResult, businessResult, credits, subscription] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select(
        "id, user_id, name, website, industry, description, target_audience, tone, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    getBalance(userId),
    getSubscriptionForUser(userId),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load profile: ${profileResult.error.message}`);
  }

  if (!profileResult.data) {
    throw new Error("Profile not found");
  }

  if (businessResult.error) {
    throw new Error(`Failed to load business: ${businessResult.error.message}`);
  }

  const profile = profileSchema.parse(profileResult.data);
  const business = businessResult.data
    ? businessSchema.parse(businessResult.data)
    : null;

  return {
    profile,
    business,
    credits: {
      ...credits,
      total: credits.plan_credits + credits.purchased_credits,
    },
    subscription: {
      plan: subscription?.plan ?? "free",
      status: subscription?.status ?? "inactive",
      current_period_end: subscription?.current_period_end ?? null,
    },
  };
}
