import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { metaPost } from "../lib/meta.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { enqueueScheduledPost } from "../queues/post-queue.js";
import { getBusinessForUser } from "./business.js";
import {
  deductCredits,
  refundCredits,
  InsufficientCreditsError,
} from "./credits.js";
import {
  getDecryptedPageToken,
  getSocialAccountById,
} from "./social-accounts.js";

const scheduledPostSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid().nullable(),
  social_account_id: z.string().uuid().nullable(),
  content: z.string(),
  media_urls: z.array(z.string()).default([]),
  scheduled_at: z.string().nullable(),
  status: z.string(),
  published_at: z.string().nullable().optional(),
  external_post_id: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type ScheduledPost = z.infer<typeof scheduledPostSchema>;

export const createScheduledPostSchema = z.object({
  socialAccountId: z.string().uuid(),
  content: z.string().trim().min(1).max(2200),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  scheduledAt: z.string().datetime(),
});

const selectFields =
  "id, user_id, business_id, social_account_id, content, media_urls, scheduled_at, status, published_at, external_post_id, error, created_at, updated_at";

function parsePost(row: unknown): ScheduledPost {
  const raw = row as Record<string, unknown>;
  const media = Array.isArray(raw.media_urls)
    ? raw.media_urls.filter((u): u is string => typeof u === "string")
    : [];
  return scheduledPostSchema.parse({ ...raw, media_urls: media });
}

export async function listScheduledPostsForUser(
  userId: string,
  options: { from?: string; to?: string; limit?: number } = {},
): Promise<ScheduledPost[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);

  let query = supabase
    .from("scheduled_posts")
    .select(selectFields)
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (options.from) query = query.gte("scheduled_at", options.from);
  if (options.to) query = query.lte("scheduled_at", options.to);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list scheduled posts: ${error.message}`);
  }

  return (data ?? []).map(parsePost);
}

export async function getScheduledPostById(
  id: string,
): Promise<ScheduledPost | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(selectFields)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scheduled post: ${error.message}`);
  }

  return data ? parsePost(data) : null;
}

export async function createScheduledPost(
  userId: string,
  input: z.infer<typeof createScheduledPostSchema>,
): Promise<ScheduledPost> {
  const account = await getSocialAccountById(input.socialAccountId);
  if (!account || account.user_id !== userId) {
    throw new Error("Social account not found");
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    throw new Error("scheduledAt must be a future datetime");
  }

  const business = await getBusinessForUser(userId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: userId,
      business_id: business?.id ?? account.business_id,
      social_account_id: account.id,
      content: input.content,
      media_urls: input.mediaUrls,
      scheduled_at: scheduledAt.toISOString(),
      status: "scheduled",
    })
    .select(selectFields)
    .single();

  if (error) {
    throw new Error(`Failed to create scheduled post: ${error.message}`);
  }

  const post = parsePost(data);

  try {
    await enqueueScheduledPost({
      postId: post.id,
      userId,
      scheduledAt,
    });
  } catch (enqueueError) {
    await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error:
          enqueueError instanceof Error
            ? enqueueError.message
            : "Failed to enqueue post",
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    throw enqueueError;
  }

  return post;
}

export async function cancelScheduledPost(
  userId: string,
  postId: string,
): Promise<ScheduledPost> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .select(selectFields)
    .single();

  if (error) {
    throw new Error(`Failed to cancel post: ${error.message}`);
  }

  return parsePost(data);
}

export async function publishScheduledPost(postId: string): Promise<ScheduledPost> {
  const post = await getScheduledPostById(postId);
  if (!post) throw new Error("Post not found");
  if (post.status === "published") return post;
  if (post.status === "cancelled") {
    throw new Error("Post was cancelled");
  }
  if (!post.social_account_id) {
    throw new Error("Post has no social account");
  }

  const supabase = getSupabaseAdmin();
  await supabase
    .from("scheduled_posts")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", post.id);

  const account = await getSocialAccountById(post.social_account_id);
  if (!account) throw new Error("Social account missing");

  const cost = CREDIT_COSTS.socialPostPublish;
  try {
    await deductCredits(post.user_id, cost, "social_post_publish");
  } catch (error) {
    const message =
      error instanceof InsufficientCreditsError
        ? "Insufficient credits"
        : error instanceof Error
          ? error.message
          : "Credit deduction failed";

    const { data } = await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .select(selectFields)
      .single();

    return parsePost(data);
  }

  try {
    const token = getDecryptedPageToken(account);
    let externalPostId: string | null = null;

    if (account.platform === "facebook") {
      const pageId = account.external_account_id!;
      if (post.media_urls[0]) {
        const result = await metaPost<{ id?: string; post_id?: string }>(
          `/${pageId}/photos`,
          token,
          {
            url: post.media_urls[0],
            caption: post.content,
            published: true,
          },
        );
        externalPostId = result.post_id ?? result.id ?? null;
      } else {
        const result = await metaPost<{ id?: string }>(`/${pageId}/feed`, token, {
          message: post.content,
        });
        externalPostId = result.id ?? null;
      }
    } else if (account.platform === "instagram") {
      const igId = account.external_account_id!;
      const imageUrl = post.media_urls[0];
      if (!imageUrl) {
        throw new Error("Instagram posts require at least one media URL");
      }

      const container = await metaPost<{ id: string }>(`/${igId}/media`, token, {
        image_url: imageUrl,
        caption: post.content,
      });

      const published = await metaPost<{ id: string }>(
        `/${igId}/media_publish`,
        token,
        { creation_id: container.id },
      );
      externalPostId = published.id;
    } else {
      throw new Error(`Unsupported platform: ${account.platform}`);
    }

    const { data } = await supabase
      .from("scheduled_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_post_id: externalPostId,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .select(selectFields)
      .single();

    return parsePost(data);
  } catch (error) {
    await refundCredits(
      post.user_id,
      cost,
      "social_post_publish_refund",
      `post_refund_${post.id}`,
    ).catch((refundError) => {
      console.error("Failed to refund post credits", refundError);
    });

    const { data } = await supabase
      .from("scheduled_posts")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Publish failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id)
      .select(selectFields)
      .single();

    return parsePost(data);
  }
}
