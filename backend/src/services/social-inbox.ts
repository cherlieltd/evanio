import { z } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";

const inboxItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid().nullable(),
  social_account_id: z.string().uuid().nullable(),
  platform: z.enum(["facebook", "instagram"]),
  thread_type: z.enum(["message", "comment"]),
  external_thread_id: z.string().nullable(),
  external_item_id: z.string(),
  sender_id: z.string().nullable(),
  sender_name: z.string().nullable(),
  content: z.string(),
  status: z.string(),
  ai_reply: z.string().nullable(),
  confidence: z.string().nullable(),
  handoff_reason: z.string().nullable(),
  replied_at: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type SocialInboxItem = z.infer<typeof inboxItemSchema>;

const selectFields =
  "id, user_id, business_id, social_account_id, platform, thread_type, external_thread_id, external_item_id, sender_id, sender_name, content, status, ai_reply, confidence, handoff_reason, replied_at, metadata, created_at, updated_at";

export async function listInboxItemsForUser(
  userId: string,
  options: { status?: string; limit?: number } = {},
): Promise<SocialInboxItem[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

  let query = supabase
    .from("social_inbox_items")
    .select(selectFields)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list inbox items: ${error.message}`);
  }

  return z.array(inboxItemSchema).parse(data ?? []);
}

export async function getInboxItemForUser(
  userId: string,
  id: string,
): Promise<SocialInboxItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_inbox_items")
    .select(selectFields)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load inbox item: ${error.message}`);
  }

  return data ? inboxItemSchema.parse(data) : null;
}

export async function upsertInboxItem(input: {
  userId: string;
  businessId: string | null;
  socialAccountId: string | null;
  platform: "facebook" | "instagram";
  threadType: "message" | "comment";
  externalThreadId?: string | null;
  externalItemId: string;
  senderId?: string | null;
  senderName?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<SocialInboxItem> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const existingLookup = await supabase
    .from("social_inbox_items")
    .select(selectFields)
    .eq("external_item_id", input.externalItemId)
    .maybeSingle();

  if (existingLookup.error) {
    throw new Error(`Failed to load inbox item: ${existingLookup.error.message}`);
  }
  if (existingLookup.data) {
    return inboxItemSchema.parse(existingLookup.data);
  }

  const { data, error } = await supabase
    .from("social_inbox_items")
    .insert({
      user_id: input.userId,
      business_id: input.businessId,
      social_account_id: input.socialAccountId,
      platform: input.platform,
      thread_type: input.threadType,
      external_thread_id: input.externalThreadId ?? null,
      external_item_id: input.externalItemId,
      sender_id: input.senderId ?? null,
      sender_name: input.senderName ?? null,
      content: input.content,
      metadata: input.metadata ?? {},
      updated_at: now,
    })
    .select(selectFields)
    .single();

  if (error) {
    const raced = await supabase
      .from("social_inbox_items")
      .select(selectFields)
      .eq("external_item_id", input.externalItemId)
      .maybeSingle();
    if (raced.data) return inboxItemSchema.parse(raced.data);
    throw new Error(`Failed to create inbox item: ${error.message}`);
  }

  return inboxItemSchema.parse(data);
}

export async function updateInboxItem(
  id: string,
  patch: Partial<{
    status: string;
    ai_reply: string | null;
    confidence: string | null;
    handoff_reason: string | null;
    replied_at: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<SocialInboxItem> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_inbox_items")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(selectFields)
    .single();

  if (error) {
    throw new Error(`Failed to update inbox item: ${error.message}`);
  }

  return inboxItemSchema.parse(data);
}
