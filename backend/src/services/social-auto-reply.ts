import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { getEviModel, getOpenAI } from "../lib/openai.js";
import { metaPost } from "../lib/meta.js";
import { getBusinessForUser } from "./business.js";
import { deductCredits, refundCredits, InsufficientCreditsError } from "./credits.js";
import { loadGenerationBrandContext } from "./generation-context.js";
import {
  getDecryptedPageToken,
  getSocialAccountById,
  type SocialAccount,
} from "./social-accounts.js";
import {
  getInboxItemForUser,
  updateInboxItem,
  type SocialInboxItem,
} from "./social-inbox.js";

const replySchema = z.object({
  reply: z.string().min(1).max(1000),
  confidence: z.enum(["high", "low"]),
  reason: z.string().min(1).max(400),
});

async function generateReplyDraft(input: {
  userId: string;
  content: string;
  threadType: "message" | "comment";
  platform: string;
}): Promise<z.infer<typeof replySchema>> {
  const [business, brand] = await Promise.all([
    getBusinessForUser(input.userId),
    loadGenerationBrandContext(input.userId),
  ]);

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: getEviModel(),
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write short, helpful social media replies for a US small business.
Return strict JSON: { "reply": string, "confidence": "high"|"low", "reason": string }.
Use confidence "low" and keep reply brief if the customer asks about refunds, legal issues, medical advice, complaints needing judgment, prices you don't know, or anything unsafe/unclear.
Never invent discounts, policies, or facts. Stay on-brand and polite.`,
      },
      {
        role: "user",
        content: `Platform: ${input.platform}
Type: ${input.threadType}
Business:
${brand.promptBlock}
${business?.website ? `Website: ${business.website}` : ""}

Customer message:
${input.content}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty auto-reply model response");
  return replySchema.parse(JSON.parse(raw));
}

async function sendGraphReply(input: {
  account: SocialAccount;
  item: SocialInboxItem;
  reply: string;
}): Promise<void> {
  const token = getDecryptedPageToken(input.account);
  const pageId =
    typeof input.account.metadata?.page_id === "string"
      ? input.account.metadata.page_id
      : input.account.external_account_id;

  if (input.item.thread_type === "message") {
    const recipientId = input.item.sender_id;
    if (!recipientId) throw new Error("Missing sender id for message reply");

    if (input.account.platform === "instagram") {
      await metaPost(`/${pageId}/messages`, token, {
        recipient: { id: recipientId },
        message: { text: input.reply },
      });
      return;
    }

    await metaPost(`/${pageId}/messages`, token, {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text: input.reply },
    });
    return;
  }

  // Comment reply
  const commentId = input.item.external_item_id;
  await metaPost(`/${commentId}/comments`, token, {
    message: input.reply,
  });
}

export async function processAutoReplyForInboxItem(
  item: SocialInboxItem,
): Promise<SocialInboxItem> {
  if (item.status !== "new") return item;
  if (!item.social_account_id) {
    return updateInboxItem(item.id, {
      status: "handed_off",
      handoff_reason: "No linked social account",
      confidence: "low",
    });
  }

  const account = await getSocialAccountById(item.social_account_id);
  if (!account) {
    return updateInboxItem(item.id, {
      status: "handed_off",
      handoff_reason: "Social account missing",
      confidence: "low",
    });
  }

  if (account.auto_reply_enabled === false) {
    return updateInboxItem(item.id, {
      status: "handed_off",
      handoff_reason: "Auto-reply disabled for this account",
      confidence: "low",
    });
  }

  const draft = await generateReplyDraft({
    userId: item.user_id,
    content: item.content,
    threadType: item.thread_type,
    platform: item.platform,
  });

  if (draft.confidence === "low") {
    return updateInboxItem(item.id, {
      status: "handed_off",
      ai_reply: draft.reply,
      confidence: "low",
      handoff_reason: draft.reason,
    });
  }

  const cost = CREDIT_COSTS.socialAutoReply;
  try {
    await deductCredits(item.user_id, cost, "social_auto_reply");
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return updateInboxItem(item.id, {
        status: "handed_off",
        ai_reply: draft.reply,
        confidence: draft.confidence,
        handoff_reason: "Insufficient credits for auto-reply",
      });
    }
    throw error;
  }

  try {
    await sendGraphReply({ account, item, reply: draft.reply });
    return updateInboxItem(item.id, {
      status: "replied",
      ai_reply: draft.reply,
      confidence: draft.confidence,
      handoff_reason: null,
      replied_at: new Date().toISOString(),
    });
  } catch (error) {
    await refundCredits(
      item.user_id,
      cost,
      "social_auto_reply_refund",
      `social_reply_refund_${item.id}`,
    ).catch((refundError) => {
      console.error("Failed to refund auto-reply credits", refundError);
    });

    return updateInboxItem(item.id, {
      status: "failed",
      ai_reply: draft.reply,
      confidence: draft.confidence,
      handoff_reason:
        error instanceof Error ? error.message : "Failed to send reply",
    });
  }
}

export async function sendManualInboxReply(input: {
  userId: string;
  itemId: string;
  message: string;
}): Promise<SocialInboxItem> {
  const existing = await getInboxItemForUser(input.userId, input.itemId);
  if (!existing) throw new Error("Inbox item not found");
  if (!existing.social_account_id) {
    throw new Error("Inbox item has no social account");
  }

  const account = await getSocialAccountById(existing.social_account_id);
  if (!account || account.user_id !== input.userId) {
    throw new Error("Social account not found");
  }

  await sendGraphReply({
    account,
    item: existing,
    reply: input.message.trim(),
  });

  return updateInboxItem(existing.id, {
    status: "replied",
    ai_reply: input.message.trim(),
    confidence: "high",
    handoff_reason: null,
    replied_at: new Date().toISOString(),
  });
}
