import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type MeResponse = {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: "user" | "admin";
    created_at: string;
  };
  business: {
    id: string;
    user_id: string;
    name: string;
    website: string | null;
    industry: string | null;
    description: string | null;
    target_audience: string | null;
    tone: string | null;
    created_at: string;
  } | null;
  credits: {
    user_id: string;
    plan_credits: number;
    purchased_credits: number;
    total: number;
  };
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
  };
};

export type CreateBusinessPayload = {
  name: string;
  website?: string;
  industry: string;
  description: string;
  target_audience: string;
  tone: string;
};

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
    const rawError = payload?.error;
    const message =
      typeof rawError === "string"
        ? rawError
        : typeof rawError?.message === "string"
          ? rawError.message
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function getMe() {
  return apiFetch<MeResponse>("/me");
}

export function createBusiness(payload: CreateBusinessPayload) {
  return apiFetch<{ business: MeResponse["business"] }>("/business", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type Generation = {
  id: string;
  user_id: string;
  type: "image" | "video" | "copy";
  prompt: string;
  result_url: string | null;
  result_json?: unknown | null;
  status: string;
  credits_used: number;
  created_at: string;
};

export function listGenerations(limit = 8) {
  return apiFetch<{ generations: Generation[] }>(`/generations?limit=${limit}`);
}

export type ImageSize = "1:1" | "9:16" | "16:9";

export type GenerateImagePayload = {
  productDescription: string;
  adGoal: string;
  size: ImageSize;
};

export function listImages(limit = 24) {
  return apiFetch<{ images: Generation[] }>(`/images?limit=${limit}`);
}

export function generateImage(payload: GenerateImagePayload) {
  return apiFetch<{ generation: Generation }>("/images/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type VideoAspect = "9:16" | "16:9";
export type VideoSeconds = "4" | "8" | "12";

export type GenerateVideoPayload = {
  productDescription: string;
  adGoal: string;
  aspectRatio?: VideoAspect;
  seconds?: VideoSeconds;
};

export function listVideos(limit = 24) {
  return apiFetch<{ videos: Generation[] }>(`/videos?limit=${limit}`);
}

export function generateVideo(payload: GenerateVideoPayload) {
  return apiFetch<{ generation: Generation }>("/videos/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AdCopyPlatformFocus = "both" | "facebook" | "google";

export type GenerateAdCopyPayload = {
  offerDescription: string;
  campaignGoal: string;
  monthlyBudgetUsd?: number;
  platformFocus?: AdCopyPlatformFocus;
};

export type AdCopyAudience = {
  name: string;
  description: string;
  platforms: Array<"facebook" | "google" | "both">;
};

export type AdCopyPlatformBudget = {
  dailyBudgetUsd: number;
  suggestedDurationDays: number;
  bidStrategy: string;
  notes: string;
};

export type AdCopyResult = {
  headlines: string[];
  primaryTexts: string[];
  ctas: string[];
  targetAudiences: AdCopyAudience[];
  budgetPlan: {
    facebook: AdCopyPlatformBudget;
    google: AdCopyPlatformBudget;
    totalMonthlyUsd: number;
    rationale: string;
  };
};

export type AdCopyHistoryItem = {
  generation: Generation;
  result: AdCopyResult | null;
};

export function listAdCopy(limit = 20) {
  return apiFetch<{ items: AdCopyHistoryItem[] }>(`/ad-copy?limit=${limit}`);
}

export function generateAdCopy(payload: GenerateAdCopyPayload) {
  return apiFetch<{ generation: Generation; result: AdCopyResult }>(
    "/ad-copy/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type BillingPlan = {
  id: string;
  name: string;
  amountUsd: number;
  monthlyCredits: number;
  blurb: string;
  features: string[];
  highlighted: boolean;
};

export type BillingCreditPack = {
  id: string;
  label: string;
  credits: number;
  amountUsd: number;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  feature: string | null;
  reference_id: string | null;
  created_at: string;
};

export type BillingOverview = {
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
  credits: {
    user_id: string;
    plan_credits: number;
    purchased_credits: number;
    total: number;
  };
  transactions: CreditTransaction[];
  catalog: {
    plans: BillingPlan[];
    creditPacks: BillingCreditPack[];
  };
};

export function getBilling() {
  return apiFetch<BillingOverview>("/billing");
}

export function checkoutSubscription(plan: string) {
  return apiFetch<{ url: string | null; id: string }>(
    "/billing/checkout-subscription",
    {
      method: "POST",
      body: JSON.stringify({ plan }),
    },
  );
}

export function checkoutCredits(pack: string) {
  return apiFetch<{ url: string | null; id: string }>(
    "/billing/checkout-credits",
    {
      method: "POST",
      body: JSON.stringify({ pack }),
    },
  );
}

export function openBillingPortal() {
  return apiFetch<{ url: string }>("/billing/portal", {
    method: "POST",
  });
}

export type EviConversation = {
  id: string;
  user_id: string;
  business_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type EviMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export function listEviConversations() {
  return apiFetch<{ conversations: EviConversation[] }>("/evi/conversations");
}

export function getEviConversation(id: string) {
  return apiFetch<{ conversation: EviConversation; messages: EviMessage[] }>(
    `/evi/conversations/${id}`,
  );
}

export type EviStreamHandlers = {
  onMeta?: (meta: { conversationId: string; userMessageId: string }) => void;
  onToken?: (token: string) => void;
  onDone?: (done: {
    conversationId: string;
    assistantMessageId: string;
  }) => void;
  onError?: (message: string) => void;
};

export async function streamEviChat(
  input: { message: string; conversationId?: string | null },
  handlers: EviStreamHandlers,
): Promise<void> {
  const env = getPublicEnv();
  const token = await getAccessToken();

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/evi/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: input.message,
      conversationId: input.conversationId ?? null,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      typeof payload?.error === "string" ? payload.error : "Chat request failed";
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("No response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) continue;
      const raw = dataLines.join("\n");
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (event === "meta") {
        handlers.onMeta?.({
          conversationId: String(payload.conversationId),
          userMessageId: String(payload.userMessageId),
        });
      } else if (event === "token") {
        handlers.onToken?.(String(payload.content ?? ""));
      } else if (event === "done") {
        handlers.onDone?.({
          conversationId: String(payload.conversationId),
          assistantMessageId: String(payload.assistantMessageId),
        });
      } else if (event === "error") {
        handlers.onError?.(String(payload.error ?? "Stream error"));
      }
    }
  }
}

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
};

export type BrandFonts = {
  heading: string;
  body: string;
};

export type BrandLogoOption = {
  id: string;
  url: string;
  style: string;
};

export type BrandKit = {
  id: string;
  business_id: string;
  logo_url: string | null;
  logo_options: BrandLogoOption[];
  colors: BrandColors;
  fonts: BrandFonts;
  tagline: string | null;
  style_notes: string | null;
  created_at: string;
  updated_at?: string;
};

export function getBrandKit() {
  return apiFetch<{
    business: MeResponse["business"];
    brandKit: BrandKit | null;
  }>("/brand-kit");
}

export function generateBrandKit() {
  return apiFetch<{ brandKit: BrandKit }>("/brand-kit/generate", {
    method: "POST",
  });
}

export function updateBrandKit(payload: {
  colors?: BrandColors;
  fonts?: BrandFonts;
  tagline?: string | null;
  style_notes?: string | null;
  logo_url?: string | null;
}) {
  return apiFetch<{ brandKit: BrandKit }>("/brand-kit", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadBrandLogo(file: File) {
  const env = getPublicEnv();
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/brand-kit/upload-logo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : "Upload failed";
    throw new Error(message);
  }

  return payload as { brandKit: BrandKit };
}

export type SocialAccount = {
  id: string;
  user_id: string;
  business_id: string | null;
  platform: string;
  account_name: string | null;
  external_account_id: string | null;
  auto_reply_enabled?: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  connected: boolean;
};

export type SocialInboxItem = {
  id: string;
  platform: "facebook" | "instagram";
  thread_type: "message" | "comment";
  sender_name: string | null;
  sender_id: string | null;
  content: string;
  status: string;
  ai_reply: string | null;
  confidence: string | null;
  handoff_reason: string | null;
  replied_at: string | null;
  created_at: string;
};

export type ScheduledPost = {
  id: string;
  social_account_id: string | null;
  content: string;
  media_urls: string[];
  scheduled_at: string | null;
  status: string;
  published_at?: string | null;
  external_post_id?: string | null;
  error?: string | null;
  created_at: string;
};

export function getMetaConnectUrl() {
  return apiFetch<{ authorizeUrl: string }>("/meta/connect");
}

export function listSocialAccounts() {
  return apiFetch<{ accounts: SocialAccount[] }>("/social/accounts");
}

export function updateSocialAccount(
  id: string,
  payload: { auto_reply_enabled: boolean },
) {
  return apiFetch<{ account: SocialAccount }>(`/social/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function disconnectSocialAccount(id: string) {
  return apiFetch<{ ok: boolean }>(`/social/accounts/${id}`, {
    method: "DELETE",
  });
}

export function listSocialInbox(status?: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (status) params.set("status", status);
  return apiFetch<{ items: SocialInboxItem[] }>(
    `/social/inbox?${params.toString()}`,
  );
}

export function replySocialInbox(id: string, message: string) {
  return apiFetch<{ item: SocialInboxItem }>(`/social/inbox/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function handoffSocialInbox(id: string) {
  return apiFetch<{ item: SocialInboxItem }>(`/social/inbox/${id}/handoff`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listScheduledPosts(from?: string, to?: string) {
  const params = new URLSearchParams({ limit: "100" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return apiFetch<{ posts: ScheduledPost[] }>(`/posts?${params.toString()}`);
}

export function createScheduledPost(payload: {
  socialAccountId: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt: string;
}) {
  return apiFetch<{ post: ScheduledPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelScheduledPost(id: string) {
  return apiFetch<{ post: ScheduledPost }>(`/posts/${id}/cancel`, {
    method: "POST",
  });
}

export type ChatWidget = {
  id: string;
  user_id: string;
  business_id: string;
  public_key: string;
  enabled: boolean;
  welcome_message: string;
  primary_color: string;
  created_at: string;
};

export type ChatWidgetLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
};

export function getChatWidget() {
  return apiFetch<{ widget: ChatWidget; embedSnippet: string }>("/widget");
}

export function updateChatWidget(payload: {
  enabled?: boolean;
  welcome_message?: string;
  primary_color?: string;
}) {
  return apiFetch<{ widget: ChatWidget }>("/widget", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function regenerateChatWidgetKey() {
  return apiFetch<{ widget: ChatWidget }>("/widget/regenerate-key", {
    method: "POST",
  });
}

export function listChatWidgetLeads(limit = 50) {
  return apiFetch<{ leads: ChatWidgetLead[] }>(
    `/widget/leads?limit=${limit}`,
  );
}
