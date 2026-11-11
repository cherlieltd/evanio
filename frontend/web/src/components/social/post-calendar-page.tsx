"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelScheduledPost,
  createScheduledPost,
  listScheduledPosts,
  listSocialAccounts,
  type ScheduledPost,
  type SocialAccount,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function toDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function PostCalendarPageContent() {
  const { refresh } = useMe();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [socialAccountId, setSocialAccountId] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = startOfMonth(month).toISOString();
    const to = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
    ).toISOString();
    return { from, to };
  }, [month]);

  async function load() {
    const [accountsData, postsData] = await Promise.all([
      listSocialAccounts(),
      listScheduledPosts(range.from, range.to),
    ]);
    setAccounts(accountsData.accounts);
    setPosts(postsData.posts);
    if (!socialAccountId && accountsData.accounts[0]) {
      setSocialAccountId(accountsData.accounts[0].id);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load()
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load calendar");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      if (!post.scheduled_at) continue;
      const key = toDateKey(post.scheduled_at);
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const dayPosts = selectedDay ? (postsByDay.get(selectedDay) ?? []) : [];

  async function onSchedule(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (!socialAccountId) throw new Error("Connect a Meta account first");
      if (!scheduledLocal) throw new Error("Pick a date and time");
      const scheduledAt = new Date(scheduledLocal).toISOString();
      const data = await createScheduledPost({
        socialAccountId,
        content,
        mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
        scheduledAt,
      });
      setPosts((current) =>
        [...current, data.post].sort((a, b) =>
          String(a.scheduled_at).localeCompare(String(b.scheduled_at)),
        ),
      );
      setContent("");
      setMediaUrl("");
      setNotice("Post scheduled. The worker will publish at the set time.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(postId: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await cancelScheduledPost(postId);
      setPosts((current) =>
        current.map((post) => (post.id === data.post.id ? data.post : post)),
      );
      setNotice("Post cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  const firstWeekday = startOfMonth(month).getDay();
  const totalDays = daysInMonth(month);
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => index + 1),
  ];

  return (
    <div>
      <PageHeader
        title="Post Calendar"
        description="Schedule Facebook and Instagram posts. A BullMQ worker publishes them on time."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form
          onSubmit={onSchedule}
          className="space-y-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm"
        >
          <h2 className="font-heading text-base font-semibold text-ink">
            Schedule a post
          </h2>

          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <select
              id="account"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={socialAccountId}
              onChange={(event) => setSocialAccountId(event.target.value)}
              required
            >
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.platform} · {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Caption</Label>
            <Textarea
              id="content"
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              minLength={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaUrl">Media URL (required for Instagram)</Label>
            <Input
              id="mediaUrl"
              type="url"
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledLocal">Publish at</Label>
            <Input
              id="scheduledLocal"
              type="datetime-local"
              value={scheduledLocal}
              onChange={(event) => setScheduledLocal(event.target.value)}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">Cost: 1 credit when published</p>

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

          <Button type="submit" disabled={busy || accounts.length === 0} className="w-full">
            {busy ? "Scheduling…" : "Schedule post"}
          </Button>
        </form>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-ink">
              {month.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMonth((current) => addMonths(current, -1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMonth((current) => addMonths(current, 1))}
              >
                Next
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {cells.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-20" />;
                  }
                  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const count = postsByDay.get(key)?.length ?? 0;
                  const active = selectedDay === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={cn(
                        "min-h-20 rounded-xl border p-2 text-left transition",
                        active
                          ? "border-brand-accent bg-brand-accent/10"
                          : "border-border/80 bg-white hover:border-brand-accent/40",
                      )}
                    >
                      <div className="text-sm font-medium text-ink">{day}</div>
                      {count > 0 ? (
                        <div className="mt-2 text-[11px] text-brand-accent">
                          {count} post{count === 1 ? "" : "s"}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
                <h3 className="font-heading text-base font-semibold text-ink">
                  {selectedDay ? `Posts on ${selectedDay}` : "Select a day"}
                </h3>
                {!selectedDay ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click a calendar day to review scheduled posts.
                  </p>
                ) : dayPosts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nothing scheduled this day.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {dayPosts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-xl border border-border/70 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-ink">{post.content}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {post.scheduled_at
                                ? new Date(post.scheduled_at).toLocaleString()
                                : "—"}{" "}
                              · {post.status}
                              {post.error ? ` · ${post.error}` : ""}
                            </p>
                          </div>
                          {post.status === "scheduled" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => void onCancel(post.id)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
