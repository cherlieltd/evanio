import { randomBytes } from "node:crypto";
import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { getEviModel, getOpenAI } from "../lib/openai.js";
import { assertRateLimit, RateLimitError } from "../lib/rate-limit.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getBusinessForUser, type Business } from "./business.js";
import {
  deductCredits,
  InsufficientCreditsError,
} from "./credits.js";
import { formatBrandKitForGeneration, getBrandKitForUser } from "./brand-kit.js";

const widgetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid(),
  public_key: z.string(),
  enabled: z.boolean(),
  welcome_message: z.string(),
  primary_color: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type ChatWidget = z.infer<typeof widgetSchema>;

const leadSchema = z.object({
  id: z.string().uuid(),
  widget_id: z.string().uuid(),
  business_id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().uuid().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  message: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
});

export type ChatWidgetLead = z.infer<typeof leadSchema>;

export const updateWidgetSchema = z.object({
  enabled: z.boolean().optional(),
  welcome_message: z.string().trim().min(1).max(280).optional(),
  primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const publicChatSchema = z.object({
  visitorId: z.string().trim().min(8).max(80),
  message: z.string().trim().min(1).max(1000),
  sessionId: z.string().uuid().optional(),
});

export const publicLeadSchema = z.object({
  visitorId: z.string().trim().min(8).max(80).optional(),
  sessionId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  message: z.string().trim().max(2000).optional(),
}).refine(
  (value) => Boolean(value.email || value.phone),
  { message: "Email or phone is required" },
);

const widgetSelect =
  "id, user_id, business_id, public_key, enabled, welcome_message, primary_color, created_at, updated_at";

const WIDGET_CHAT_LIMIT_PER_MIN = Number(
  process.env.WIDGET_RATE_LIMIT_PER_MIN ?? 30,
);

function newPublicKey(): string {
  return `wk_${randomBytes(18).toString("hex")}`;
}

export async function getOrCreateWidgetForUser(
  userId: string,
): Promise<ChatWidget> {
  const supabase = getSupabaseAdmin();
  const existing = await supabase
    .from("chat_widgets")
    .select(widgetSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Failed to load widget: ${existing.error.message}`);
  }
  if (existing.data) return widgetSchema.parse(existing.data);

  const business = await getBusinessForUser(userId);
  if (!business) {
    throw new Error("Create a business profile before enabling the chat widget");
  }

  const { data, error } = await supabase
    .from("chat_widgets")
    .insert({
      user_id: userId,
      business_id: business.id,
      public_key: newPublicKey(),
      enabled: true,
    })
    .select(widgetSelect)
    .single();

  if (error) {
    // Race: another request created it
    const again = await supabase
      .from("chat_widgets")
      .select(widgetSelect)
      .eq("user_id", userId)
      .single();
    if (again.data) return widgetSchema.parse(again.data);
    throw new Error(`Failed to create widget: ${error.message}`);
  }

  return widgetSchema.parse(data);
}

export async function updateWidgetForUser(
  userId: string,
  patch: z.infer<typeof updateWidgetSchema>,
): Promise<ChatWidget> {
  const widget = await getOrCreateWidgetForUser(userId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widgets")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", widget.id)
    .eq("user_id", userId)
    .select(widgetSelect)
    .single();

  if (error) {
    throw new Error(`Failed to update widget: ${error.message}`);
  }

  return widgetSchema.parse(data);
}

export async function regenerateWidgetKey(userId: string): Promise<ChatWidget> {
  const widget = await getOrCreateWidgetForUser(userId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widgets")
    .update({
      public_key: newPublicKey(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", widget.id)
    .eq("user_id", userId)
    .select(widgetSelect)
    .single();

  if (error) {
    throw new Error(`Failed to regenerate widget key: ${error.message}`);
  }

  return widgetSchema.parse(data);
}

export async function listWidgetLeads(
  userId: string,
  limit = 50,
): Promise<ChatWidgetLead[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widget_leads")
    .select(
      "id, widget_id, business_id, user_id, session_id, name, email, phone, message, metadata, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) {
    throw new Error(`Failed to list leads: ${error.message}`);
  }

  return z.array(leadSchema).parse(data ?? []);
}

async function getWidgetByPublicKey(publicKey: string): Promise<ChatWidget> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widgets")
    .select(widgetSelect)
    .eq("public_key", publicKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load widget: ${error.message}`);
  }
  if (!data) {
    throw new Error("Widget not found");
  }

  const widget = widgetSchema.parse(data);
  if (!widget.enabled) {
    throw new Error("Widget is disabled");
  }
  return widget;
}

async function loadBusiness(businessId: string): Promise<Business> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, user_id, name, website, industry, description, target_audience, tone, created_at",
    )
    .eq("id", businessId)
    .single();

  if (error) {
    throw new Error(`Failed to load business: ${error.message}`);
  }

  return data as Business;
}

export async function getPublicWidgetConfig(publicKey: string) {
  const widget = await getWidgetByPublicKey(publicKey);
  const business = await loadBusiness(widget.business_id);

  return {
    publicKey: widget.public_key,
    enabled: widget.enabled,
    welcomeMessage: widget.welcome_message,
    primaryColor: widget.primary_color,
    businessName: business.name,
  };
}

async function getOrCreateSession(input: {
  widgetId: string;
  visitorId: string;
  sessionId?: string;
}): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin();

  if (input.sessionId) {
    const existing = await supabase
      .from("chat_widget_sessions")
      .select("id, widget_id")
      .eq("id", input.sessionId)
      .eq("widget_id", input.widgetId)
      .maybeSingle();
    if (existing.data) return { id: existing.data.id };
  }

  const { data, error } = await supabase
    .from("chat_widget_sessions")
    .upsert(
      {
        widget_id: input.widgetId,
        visitor_id: input.visitorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "widget_id,visitor_id" },
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return { id: data.id };
}

async function appendMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("chat_widget_messages").insert({
    session_id: input.sessionId,
    role: input.role,
    content: input.content,
  });
  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

async function loadRecentMessages(sessionId: string, limit = 12) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widget_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data ?? [])
    .reverse()
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content as string,
    }));
}

export async function publicWidgetChat(
  publicKey: string,
  input: z.infer<typeof publicChatSchema>,
) {
  const widget = await getWidgetByPublicKey(publicKey);

  await assertRateLimit({
    key: `widget:${widget.business_id}`,
    limit: WIDGET_CHAT_LIMIT_PER_MIN,
    windowSec: 60,
  });

  await deductCredits(
    widget.user_id,
    CREDIT_COSTS.widgetChatMessage,
    "widget_chat",
  );

  const session = await getOrCreateSession({
    widgetId: widget.id,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
  });

  await appendMessage({
    sessionId: session.id,
    role: "user",
    content: input.message,
  });

  const [business, brand, history] = await Promise.all([
    loadBusiness(widget.business_id),
    getBrandKitForUser(widget.user_id),
    loadRecentMessages(session.id),
  ]);

  const context = formatBrandKitForGeneration({
    business,
    brandKit: brand.brandKit,
  });

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: getEviModel(),
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You are the website chat assistant for ${business.name}.
Answer briefly and helpfully using only the business information provided.
If you do not know something, say so and offer to collect the visitor's contact details so the team can follow up.
Do not invent prices, policies, or guarantees.
Encourage leaving a name and email when the visitor wants a quote, booking, or human follow-up.

Business context:
${context}`,
      },
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
  });

  const reply =
    completion.choices[0]?.message?.content?.trim() ||
    "Thanks for reaching out — leave your email and our team will follow up.";

  await appendMessage({
    sessionId: session.id,
    role: "assistant",
    content: reply,
  });

  return {
    sessionId: session.id,
    reply,
  };
}

export async function publicWidgetLead(
  publicKey: string,
  input: z.infer<typeof publicLeadSchema>,
) {
  const widget = await getWidgetByPublicKey(publicKey);

  await assertRateLimit({
    key: `widget-lead:${widget.business_id}`,
    limit: 10,
    windowSec: 60,
  });

  let sessionId: string | null = input.sessionId ?? null;
  if (input.visitorId) {
    const session = await getOrCreateSession({
      widgetId: widget.id,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
    });
    sessionId = session.id;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_widget_leads")
    .insert({
      widget_id: widget.id,
      business_id: widget.business_id,
      user_id: widget.user_id,
      session_id: sessionId,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message ?? null,
      metadata: {},
    })
    .select(
      "id, widget_id, business_id, user_id, session_id, name, email, phone, message, metadata, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to save lead: ${error.message}`);
  }

  return leadSchema.parse(data);
}

export { RateLimitError, InsufficientCreditsError };
