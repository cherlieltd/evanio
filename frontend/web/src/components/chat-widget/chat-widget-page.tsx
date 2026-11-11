"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getChatWidget,
  listChatWidgetLeads,
  regenerateChatWidgetKey,
  updateChatWidget,
  type ChatWidget,
  type ChatWidgetLead,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatWidgetPageContent() {
  const [widget, setWidget] = useState<ChatWidget | null>(null);
  const [embedSnippet, setEmbedSnippet] = useState("");
  const [leads, setLeads] = useState<ChatWidgetLead[]>([]);
  const [welcome, setWelcome] = useState("");
  const [color, setColor] = useState("#047857");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [widgetData, leadsData] = await Promise.all([
      getChatWidget(),
      listChatWidgetLeads(50),
    ]);
    setWidget(widgetData.widget);
    setEmbedSnippet(widgetData.embedSnippet);
    setWelcome(widgetData.widget.welcome_message);
    setColor(widgetData.widget.primary_color);
    setEnabled(widgetData.widget.enabled);
    setLeads(leadsData.leads);
  }

  useEffect(() => {
    let active = true;
    void load()
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load widget");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await updateChatWidget({
        enabled,
        welcome_message: welcome,
        primary_color: color,
      });
      setWidget(data.widget);
      setNotice("Widget settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setNotice("Embed code copied.");
    } catch {
      setError("Could not copy. Select the snippet manually.");
    }
  }

  async function onRegenerate() {
    setBusy(true);
    setError(null);
    try {
      const data = await regenerateChatWidgetKey();
      setWidget(data.widget);
      const refreshed = await getChatWidget();
      setEmbedSnippet(refreshed.embedSnippet);
      setNotice("New public key generated. Update the snippet on your site.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chat Widget"
        description="Add one line of code to your website. Evi answers from your business info and collects leads."
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-base font-semibold text-ink">
          Embed code
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste this before <code className="text-xs">&lt;/body&gt;</code> on
          your site.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
          {embedSnippet}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void onCopy()}>
            Copy snippet
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void onRegenerate()}
          >
            Regenerate key
          </Button>
        </div>
        {widget ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Public key: <span className="font-mono">{widget.public_key}</span>
          </p>
        ) : null}
      </section>

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm"
      >
        <h2 className="font-heading text-base font-semibold text-ink">
          Settings
        </h2>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Widget enabled
        </label>

        <div className="space-y-2">
          <Label htmlFor="welcome">Welcome message</Label>
          <Textarea
            id="welcome"
            rows={3}
            value={welcome}
            onChange={(event) => setWelcome(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Primary color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              className="max-w-[9rem] font-mono"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Public chat is rate-limited per business (default 30 messages/min) and
          uses 1 credit per visitor message.
        </p>

        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </form>

      <section>
        <h2 className="font-heading text-lg font-semibold text-ink">Leads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Captured from the widget Contact form.
        </p>
        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No leads yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn("border-b border-border last:border-0")}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{lead.name ?? "—"}</td>
                    <td className="px-4 py-3">{lead.email ?? "—"}</td>
                    <td className="px-4 py-3">{lead.phone ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {lead.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
