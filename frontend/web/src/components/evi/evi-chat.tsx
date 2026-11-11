"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Menu, Plus, SendHorizontal } from "lucide-react";
import { useMe } from "@/components/dashboard/me-provider";
import { MarkdownMessage } from "@/components/evi/markdown-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getEviConversation,
  listEviConversations,
  streamEviChat,
  type EviConversation,
  type EviMessage,
} from "@/lib/api";
import { eviQuickPrompts } from "@/lib/evi-prompts";
import { cn } from "@/lib/utils";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

function toUiMessages(messages: EviMessage[]): UiMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") {
      return [];
    }

    return [
      {
        id: message.id,
        role: message.role,
        content: message.content,
      },
    ];
  });
}

export function EviChat() {
  const { refresh } = useMe();
  const [conversations, setConversations] = useState<EviConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId],
  );

  async function refreshConversations() {
    const data = await listEviConversations();
    setConversations(data.conversations);
  }

  useEffect(() => {
    let active = true;

    void listEviConversations()
      .then((data) => {
        if (!active) return;
        setConversations(data.conversations);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load conversations",
        );
      })
      .finally(() => {
        if (!active) return;
        setLoadingList(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function openConversation(id: string) {
    setSidebarOpen(false);
    setActiveId(id);
    setLoadingThread(true);
    setError(null);

    try {
      const data = await getEviConversation(id);
      setMessages(toUiMessages(data.messages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      setLoadingThread(false);
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
  }

  async function sendMessage(raw: string) {
    const message = raw.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);
    setInput("");

    const tempUserId = `local-user-${Date.now()}`;
    const tempAssistantId = `local-assistant-${Date.now()}`;

    setMessages((current) => [
      ...current,
      { id: tempUserId, role: "user", content: message },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);

    try {
      await streamEviChat(
        { message, conversationId: activeId },
        {
          onMeta: ({ conversationId }) => {
            setActiveId(conversationId);
          },
          onToken: (token) => {
            setMessages((current) =>
              current.map((item) =>
                item.id === tempAssistantId
                  ? { ...item, content: item.content + token }
                  : item,
              ),
            );
          },
          onDone: async ({ conversationId, assistantMessageId }) => {
            setActiveId(conversationId);
            setMessages((current) =>
              current.map((item) =>
                item.id === tempAssistantId
                  ? { ...item, id: assistantMessageId, streaming: false }
                  : item,
              ),
            );
            await refreshConversations();
            await refresh();
          },
          onError: (streamError) => {
            setError(streamError);
          },
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((current) =>
        current.filter(
          (item) => item.id !== tempUserId && item.id !== tempAssistantId,
        ),
      );
      setInput(message);
    } finally {
      setSending(false);
      setMessages((current) =>
        current.map((item) =>
          item.id === tempAssistantId ? { ...item, streaming: false } : item,
        ),
      );
    }
  }

  return (
    <div className="relative -mx-4 -my-6 flex h-[calc(100vh-3.5rem)] min-h-[560px] overflow-hidden border-y border-border bg-background sm:-mx-6 sm:-my-8">
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <Image
              src="/evi.png"
              alt="Evi"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover"
            />
            <p className="font-heading text-sm font-semibold text-ink">Evi 2.0</p>
          </div>
          <Button size="sm" variant="outline" onClick={startNewChat}>
            <Plus className="size-3.5" />
            New
          </Button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-2">
          {loadingList ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No chats yet. Ask Evi anything about your marketing.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      activeId === conversation.id
                        ? "bg-surface text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="line-clamp-2">
                      {conversation.title || "Untitled chat"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-10 bg-ink/30 lg:hidden"
          aria-label="Close conversations"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open conversations"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-semibold text-ink">
              {activeConversation?.title || "New chat with Evi"}
            </p>
            <p className="text-xs text-muted-foreground">
              1 credit per message · advice tailored to your business
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5">
          {loadingThread ? (
            <p className="text-sm text-muted-foreground">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 pt-6">
              <div className="flex items-center gap-3 text-brand">
                <Image
                  src="/evi.png"
                  alt="Evi"
                  width={40}
                  height={40}
                  className="size-10 rounded-[10px] object-cover shadow-sm"
                />
                <p className="font-heading text-lg font-semibold text-ink">
                  What should we work on?
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {eviQuickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:bg-surface hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "mx-auto flex w-full max-w-3xl",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "flex max-w-[92%] items-end gap-2",
                    message.role === "user" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {message.role === "assistant" ? (
                    <Image
                      src="/evi.png"
                      alt="Evi"
                      width={28}
                      height={28}
                      className="mb-0.5 size-7 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-brand text-brand-foreground"
                        : "border border-border bg-surface",
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <MarkdownMessage content={message.content} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Evi is thinking...
                        </p>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          {error ? (
            <p className="mb-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Evi for campaign ideas, ad copy, posting plans..."
              rows={2}
              disabled={sending}
              className="min-h-[64px] flex-1 resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-10 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <SendHorizontal className="size-4" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
