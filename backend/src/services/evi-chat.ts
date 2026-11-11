import { z } from "zod";
import { getEviModel, getOpenAI } from "../lib/openai.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import {
  buildEviSystemPrompt,
  loadEviBusinessContext,
} from "./evi-context.js";

const conversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_id: z.string().uuid().nullable(),
  title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  created_at: z.string(),
});

export type ChatConversation = z.infer<typeof conversationSchema>;
export type ChatMessage = z.infer<typeof messageSchema>;

function titleFromMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 57).trimEnd()}...`;
}

export async function listConversations(
  userId: string,
): Promise<ChatConversation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, user_id, business_id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  return z.array(conversationSchema).parse(data ?? []);
}

export async function getConversationForUser(
  userId: string,
  conversationId: string,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  const supabase = getSupabaseAdmin();

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id, user_id, business_id, title, created_at, updated_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    throw new Error(`Failed to load conversation: ${conversationError.message}`);
  }

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(`Failed to load messages: ${messagesError.message}`);
  }

  return {
    conversation: conversationSchema.parse(conversation),
    messages: z.array(messageSchema).parse(messages ?? []),
  };
}

async function createConversation(input: {
  userId: string;
  businessId: string | null;
  title: string;
}): Promise<ChatConversation> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: input.userId,
      business_id: input.businessId,
      title: input.title,
      updated_at: now,
    })
    .select("id, user_id, business_id, title, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return conversationSchema.parse(data);
}

async function touchConversation(conversationId: string, title?: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("chat_conversations")
    .update({
      updated_at: new Date().toISOString(),
      ...(title ? { title } : {}),
    })
    .eq("id", conversationId);

  if (error) {
    throw new Error(`Failed to update conversation: ${error.message}`);
  }
}

async function insertMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<ChatMessage> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return messageSchema.parse(data);
}

export async function prepareEviChat(input: {
  userId: string;
  message: string;
  conversationId?: string | null;
}): Promise<{
  conversation: ChatConversation;
  userMessage: ChatMessage;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}> {
  const context = await loadEviBusinessContext(input.userId);
  const systemPrompt = buildEviSystemPrompt(context);

  let conversation: ChatConversation;

  if (input.conversationId) {
    const existing = await getConversationForUser(
      input.userId,
      input.conversationId,
    );
    conversation = existing.conversation;
  } else {
    conversation = await createConversation({
      userId: input.userId,
      businessId: context.business?.id ?? null,
      title: titleFromMessage(input.message),
    });
  }

  const userMessage = await insertMessage({
    conversationId: conversation.id,
    role: "user",
    content: input.message,
  });

  await touchConversation(
    conversation.id,
    conversation.title ? undefined : titleFromMessage(input.message),
  );

  const { messages } = await getConversationForUser(
    input.userId,
    conversation.id,
  );

  const history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-20)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
  ];

  return { conversation, userMessage, history };
}

export async function streamEviReply(input: {
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  onToken: (token: string) => Promise<void> | void;
}): Promise<string> {
  const openai = getOpenAI();
  const stream = await openai.chat.completions.create({
    model: getEviModel(),
    stream: true,
    temperature: 0.7,
    messages: input.history,
  });

  let full = "";

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    if (!token) continue;
    full += token;
    await input.onToken(token);
  }

  return full;
}

export async function saveAssistantMessage(input: {
  conversationId: string;
  content: string;
}): Promise<ChatMessage> {
  const message = await insertMessage({
    conversationId: input.conversationId,
    role: "assistant",
    content: input.content,
  });

  await touchConversation(input.conversationId);
  return message;
}
