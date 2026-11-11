"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  disconnectSocialAccount,
  getMetaConnectUrl,
  handoffSocialInbox,
  listSocialAccounts,
  listSocialInbox,
  replySocialInbox,
  updateSocialAccount,
  type SocialAccount,
  type SocialInboxItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "handed_off", label: "Needs human" },
  { value: "replied", label: "Replied" },
  { value: "failed", label: "Failed" },
] as const;

export function SocialInboxPageContent() {
  const { refresh } = useMe();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [items, setItems] = useState<SocialInboxItem[]>([]);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [accountsData, inboxData] = await Promise.all([
      listSocialAccounts(),
      listSocialInbox(status || undefined),
    ]);
    setAccounts(accountsData.accounts);
    setItems(inboxData.items);
    setSelectedId((current) => current ?? inboxData.items[0]?.id ?? null);
  }

  useEffect(() => {
    const meta = searchParams.get("meta");
    if (meta === "connected") {
      setNotice(
        `Connected ${searchParams.get("count") ?? "0"} Meta account(s).`,
      );
    } else if (meta === "error") {
      setError(searchParams.get("reason") ?? "Meta connection failed");
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load()
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load inbox");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selected?.ai_reply) setReply(selected.ai_reply);
    else setReply("");
  }, [selected?.id, selected?.ai_reply]);

  async function connectMeta() {
    setBusy(true);
    setError(null);
    try {
      const data = await getMetaConnectUrl();
      window.location.href = data.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      setBusy(false);
    }
  }

  async function toggleAutoReply(account: SocialAccount) {
    setBusy(true);
    setError(null);
    try {
      const data = await updateSocialAccount(account.id, {
        auto_reply_enabled: !(account.auto_reply_enabled ?? true),
      });
      setAccounts((current) =>
        current.map((row) => (row.id === account.id ? data.account : row)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(account: SocialAccount) {
    setBusy(true);
    setError(null);
    try {
      await disconnectSocialAccount(account.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await replySocialInbox(selected.id, reply.trim());
      setItems((current) =>
        current.map((item) => (item.id === data.item.id ? data.item : item)),
      );
      setNotice("Reply sent.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  async function markHandoff() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const data = await handoffSocialInbox(selected.id);
      setItems((current) =>
        current.map((item) => (item.id === data.item.id ? data.item : item)),
      );
      setNotice("Marked for human follow-up.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handoff failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Social Inbox"
        description="Connect Facebook Pages and Instagram, auto-reply when confident, and hand off the rest."
      />

      <div className="mb-6 space-y-3 rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-ink">
              Connected accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              Page tokens are encrypted at rest.
            </p>
          </div>
          <Button type="button" onClick={() => void connectMeta()} disabled={busy}>
            Connect Meta
          </Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {account.account_name ?? account.external_account_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.platform} · auto-reply{" "}
                    {(account.auto_reply_enabled ?? true) ? "on" : "off"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void toggleAutoReply(account)}
                  >
                    {(account.auto_reply_enabled ?? true) ? "Disable" : "Enable"}{" "}
                    auto-reply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void disconnect(account)}
                  >
                    Disconnect
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              status === filter.value
                ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                : "border-border text-muted-foreground hover:border-brand-accent/40",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading inbox…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className="space-y-2">
            {items.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No conversations yet.
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full rounded-xl border bg-white px-4 py-3 text-left transition",
                      selectedId === item.id
                        ? "border-brand-accent shadow-sm"
                        : "border-border/80 hover:border-brand-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {item.sender_name || item.sender_id || "Unknown"}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.content}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {item.platform} · {item.thread_type} ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>

          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select a conversation.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {selected.platform} {selected.thread_type}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-semibold text-ink">
                    {selected.sender_name || selected.sender_id || "Customer"}
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {selected.content}
                  </p>
                </div>

                {selected.handoff_reason ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Needs human: {selected.handoff_reason}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="reply">Reply</Label>
                  <Textarea
                    id="reply"
                    rows={5}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write a reply…"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || !reply.trim()}
                    onClick={() => void sendReply()}
                  >
                    Send reply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void markHandoff()}
                  >
                    Hand off to human
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
