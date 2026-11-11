import {
  getSocialAccountByExternalId,
} from "./social-accounts.js";
import { processAutoReplyForInboxItem } from "./social-auto-reply.js";
import { upsertInboxItem } from "./social-inbox.js";

type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean };
  timestamp?: number;
};

type MetaChangeValue = {
  item?: string;
  verb?: string;
  comment_id?: string;
  post_id?: string;
  parent_id?: string;
  from?: { id?: string; name?: string };
  message?: string;
  text?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

async function handlePageMessaging(
  pageId: string,
  events: MetaMessagingEvent[],
) {
  const account = await getSocialAccountByExternalId("facebook", pageId);
  if (!account) return;

  for (const event of events) {
    if (!event.message || event.message.is_echo || !event.message.text) continue;
    const externalItemId = event.message.mid;
    if (!externalItemId) continue;

    const item = await upsertInboxItem({
      userId: account.user_id,
      businessId: account.business_id,
      socialAccountId: account.id,
      platform: "facebook",
      threadType: "message",
      externalThreadId: event.sender?.id ?? null,
      externalItemId,
      senderId: event.sender?.id ?? null,
      senderName: null,
      content: event.message.text,
      metadata: { page_id: pageId, source: "webhook" },
    });

    if (item.status === "new") {
      await processAutoReplyForInboxItem(item).catch((error) => {
        console.error("Auto-reply failed for message", error);
      });
    }
  }
}

async function handleInstagramMessaging(
  igId: string,
  events: MetaMessagingEvent[],
) {
  const account = await getSocialAccountByExternalId("instagram", igId);
  if (!account) return;

  for (const event of events) {
    if (!event.message || event.message.is_echo || !event.message.text) continue;
    const externalItemId = event.message.mid;
    if (!externalItemId) continue;

    const item = await upsertInboxItem({
      userId: account.user_id,
      businessId: account.business_id,
      socialAccountId: account.id,
      platform: "instagram",
      threadType: "message",
      externalThreadId: event.sender?.id ?? null,
      externalItemId,
      senderId: event.sender?.id ?? null,
      senderName: null,
      content: event.message.text,
      metadata: { ig_id: igId, source: "webhook" },
    });

    if (item.status === "new") {
      await processAutoReplyForInboxItem(item).catch((error) => {
        console.error("Auto-reply failed for IG message", error);
      });
    }
  }
}

async function handleFeedComment(pageId: string, value: MetaChangeValue) {
  if (value.item !== "comment" || value.verb !== "add") return;
  if (!value.comment_id || !value.message) return;

  const account = await getSocialAccountByExternalId("facebook", pageId);
  if (!account) return;

  // Skip replies from the page itself when possible
  if (value.from?.id && value.from.id === pageId) return;

  const item = await upsertInboxItem({
    userId: account.user_id,
    businessId: account.business_id,
    socialAccountId: account.id,
    platform: "facebook",
    threadType: "comment",
    externalThreadId: value.post_id ?? value.parent_id ?? null,
    externalItemId: value.comment_id,
    senderId: value.from?.id ?? null,
    senderName: value.from?.name ?? null,
    content: value.message,
    metadata: { page_id: pageId, source: "webhook" },
  });

  if (item.status === "new") {
    await processAutoReplyForInboxItem(item).catch((error) => {
      console.error("Auto-reply failed for comment", error);
    });
  }
}

async function handleInstagramComment(igId: string, value: MetaChangeValue) {
  if (!value.comment_id && !value.text && !value.message) return;
  const commentId = value.comment_id;
  const text = value.text ?? value.message;
  if (!commentId || !text) return;

  const account = await getSocialAccountByExternalId("instagram", igId);
  if (!account) return;

  const item = await upsertInboxItem({
    userId: account.user_id,
    businessId: account.business_id,
    socialAccountId: account.id,
    platform: "instagram",
    threadType: "comment",
    externalThreadId: value.post_id ?? null,
    externalItemId: commentId,
    senderId: value.from?.id ?? null,
    senderName: value.from?.name ?? null,
    content: text,
    metadata: { ig_id: igId, source: "webhook" },
  });

  if (item.status === "new") {
    await processAutoReplyForInboxItem(item).catch((error) => {
      console.error("Auto-reply failed for IG comment", error);
    });
  }
}

export async function processMetaWebhookPayload(payload: unknown): Promise<void> {
  const root = asRecord(payload);
  if (!root) return;

  const entries = Array.isArray(root.entry) ? root.entry : [];
  for (const entryUnknown of entries) {
    const entry = asRecord(entryUnknown);
    if (!entry) continue;
    const entryId = typeof entry.id === "string" ? entry.id : null;
    if (!entryId) continue;

    const messaging = Array.isArray(entry.messaging)
      ? (entry.messaging as MetaMessagingEvent[])
      : [];

    if (messaging.length > 0) {
      // Page Messenger uses page id; IG messaging uses IG user id
      if (root.object === "instagram") {
        await handleInstagramMessaging(entryId, messaging);
      } else {
        await handlePageMessaging(entryId, messaging);
      }
    }

    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const changeUnknown of changes) {
      const change = asRecord(changeUnknown);
      if (!change) continue;
      const value = asRecord(change.value) as MetaChangeValue | null;
      if (!value) continue;
      const field = typeof change.field === "string" ? change.field : "";

      if (root.object === "page" && (field === "feed" || field === "comments")) {
        await handleFeedComment(entryId, value);
      }

      if (root.object === "instagram" && field === "comments") {
        await handleInstagramComment(entryId, value);
      }
    }
  }
}
