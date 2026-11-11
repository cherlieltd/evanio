import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const env = getPublicEnv();
  const token = await getAccessToken();

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export type AdminMe = {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: "user" | "admin";
    created_at: string;
  };
  credits: {
    plan_credits: number;
    purchased_credits: number;
    total: number;
  };
};

export type AdminOverview = {
  users: number;
  activeSubscriptions: number;
  mrr: number;
  creditsUsedToday: number;
  failedGenerations: number;
};

export type AdminUserRow = {
  profile: AdminMe["profile"] & { suspended?: boolean };
  business: { id: string; name: string; industry: string | null } | null;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    stripe_customer_id?: string | null;
  } | null;
  credits: {
    plan_credits: number;
    purchased_credits: number;
    total: number;
  } | null;
};

export function getAdminMe() {
  return apiFetch<AdminMe>("/admin/me");
}

export function getAdminOverview() {
  return apiFetch<AdminOverview>("/admin/overview");
}

export function listAdminUsers(q?: string) {
  const params = new URLSearchParams({ limit: "100" });
  if (q?.trim()) params.set("q", q.trim());
  return apiFetch<{ total: number; users: AdminUserRow[] }>(
    `/admin/users?${params.toString()}`,
  );
}

export function getAdminUser(id: string) {
  return apiFetch<{
    profile: AdminMe["profile"];
    business: Record<string, unknown> | null;
    subscription: Record<string, unknown> | null;
    credits: {
      plan_credits: number;
      purchased_credits: number;
      total: number;
    } | null;
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      feature: string | null;
      created_at: string;
    }>;
    generations: Array<{
      id: string;
      type: string;
      status: string;
      prompt: string;
      credits_used: number;
      created_at: string;
    }>;
  }>(`/admin/users/${id}`);
}

export function adjustUserCredits(
  id: string,
  payload: { amount: number; reason: string },
) {
  return apiFetch<{
    credits: {
      plan_credits: number;
      purchased_credits: number;
      total: number;
    };
  }>(`/admin/users/${id}/credits`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listAdminSubscriptions() {
  return apiFetch<{
    mrr: number;
    activeCount: number;
    subscriptions: Array<{
      subscription: {
        id: string;
        user_id: string;
        plan: string;
        status: string;
        current_period_end: string | null;
        stripe_subscription_id: string | null;
        created_at: string;
      };
      profile: AdminMe["profile"] | null;
      amountUsd: number;
    }>;
  }>("/admin/subscriptions");
}

export function listAdminCredits() {
  return apiFetch<{
    transactions: Array<{
      id: string;
      user_id: string;
      amount: number;
      type: string;
      feature: string | null;
      reference_id: string | null;
      created_at: string;
      email: string | null;
      full_name: string | null;
    }>;
  }>("/admin/credits?limit=100");
}

export function getAdminUsage() {
  return apiFetch<{
    usage: Array<{ feature: string; credits: number; count: number }>;
    failedGenerations: Array<{
      id: string;
      user_id: string;
      type: string;
      prompt: string;
      status: string;
      credits_used: number;
      created_at: string;
      result_json?: unknown;
    }>;
  }>("/admin/usage");
}

export type BillingSettings = {
  defaults: {
    plans: Array<{
      id: string;
      name: string;
      amountUsd: number;
      monthlyCredits: number;
      blurb: string;
      features: string[];
      highlighted: boolean;
    }>;
    creditPacks: Array<{
      id: string;
      label: string;
      credits: number;
      amountUsd: number;
    }>;
  };
  overrides: Record<string, unknown>;
  effective: {
    plans: Array<{
      id: string;
      name: string;
      amountUsd: number;
      monthlyCredits: number;
      blurb: string;
      features: string[];
      highlighted: boolean;
    }>;
    creditPacks: Array<{
      id: string;
      label: string;
      credits: number;
      amountUsd: number;
    }>;
  };
  creditCosts?: Array<{
    key: string;
    feature: string;
    credits: number;
  }>;
};

export function getBillingSettings() {
  return apiFetch<BillingSettings>("/admin/settings/billing");
}

export function updateBillingSettings(payload: {
  plans?: Record<
    string,
    Partial<{
      name: string;
      amountUsd: number;
      monthlyCredits: number;
      blurb: string;
      features: string[];
      highlighted: boolean;
    }>
  >;
  creditPacks?: Record<
    string,
    Partial<{ label: string; credits: number; amountUsd: number }>
  >;
}) {
  return apiFetch<BillingSettings>("/admin/settings/billing", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
