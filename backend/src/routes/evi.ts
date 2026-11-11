import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { CREDIT_COSTS } from "../config/credits.js";
import { requireAuth } from "../middleware/require-auth.js";
import {
  deductCredits,
  InsufficientCreditsError,
} from "../services/credits.js";
import {
  getConversationForUser,
  listConversations,
  prepareEviChat,
  saveAssistantMessage,
  streamEviReply,
} from "../services/evi-chat.js";
import type { AppVariables } from "../types/context.js";

export const eviRoutes = new Hono<{ Variables: AppVariables }>();

const chatBodySchema = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationId: z.string().uuid().optional().nullable(),
});

eviRoutes.get("/evi/conversations", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const conversations = await listConversations(user.id);
    return c.json({ conversations });
  } catch (error) {
    console.error("GET /evi/conversations failed", error);
    return c.json({ error: "Failed to load conversations" }, 500);
  }
});

eviRoutes.get("/evi/conversations/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const conversationId = c.req.param("id");

  try {
    const result = await getConversationForUser(user.id, conversationId);
    return c.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load conversation";
    if (message === "Conversation not found") {
      return c.json({ error: message }, 404);
    }
    console.error("GET /evi/conversations/:id failed", error);
    return c.json({ error: "Failed to load conversation" }, 500);
  }
});

eviRoutes.post("/evi/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = chatBodySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid chat payload" }, 400);
  }

  let prepared;
  try {
    prepared = await prepareEviChat({
      userId: user.id,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
    });
  } catch (error) {
    console.error("Evi chat prepare failed", error);
    return c.json({ error: "Failed to start chat" }, 500);
  }

  try {
    await deductCredits(user.id, CREDIT_COSTS.eviChatMessage, "evi_chat");
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return c.json({ error: "Insufficient credits" }, 402);
    }
    console.error("Evi credit deduction failed", error);
    return c.json({ error: "Failed to deduct credits" }, 500);
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "meta",
      data: JSON.stringify({
        conversationId: prepared.conversation.id,
        userMessageId: prepared.userMessage.id,
      }),
    });

    try {
      const fullText = await streamEviReply({
        history: prepared.history,
        onToken: async (token) => {
          await stream.writeSSE({
            event: "token",
            data: JSON.stringify({ content: token }),
          });
        },
      });

      const assistantMessage = await saveAssistantMessage({
        conversationId: prepared.conversation.id,
        content: fullText,
      });

      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({
          conversationId: prepared.conversation.id,
          assistantMessageId: assistantMessage.id,
        }),
      });
    } catch (error) {
      console.error("Evi stream failed", error);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error:
            error instanceof Error ? error.message : "Failed to generate reply",
        }),
      });
    }
  });
});
