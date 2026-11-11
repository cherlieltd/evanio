"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateVideo,
  listVideos,
  type Generation,
  type VideoAspect,
  type VideoSeconds,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ASPECT_OPTIONS: { value: VideoAspect; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16", hint: "Reels / Stories" },
  { value: "16:9", label: "16:9", hint: "YouTube / landscape" },
];

const DURATION_OPTIONS: { value: VideoSeconds; label: string }[] = [
  { value: "4", label: "4s" },
  { value: "8", label: "8s" },
  { value: "12", label: "12s" },
];

const AD_GOAL_SUGGESTIONS = [
  "Drive website visits",
  "Promote a limited-time offer",
  "Build brand awareness",
  "Get more local foot traffic",
];

function statusLabel(status: string) {
  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function progressFromJson(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const progress = (value as { progress?: unknown }).progress;
  return typeof progress === "number" ? Math.round(progress) : null;
}

async function downloadVideo(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Download failed");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function upsertVideo(list: Generation[], next: Generation): Generation[] {
  const without = list.filter((item) => item.id !== next.id);
  return [next, ...without].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function VideosPageContent() {
  const { me, refresh } = useMe();
  const [productDescription, setProductDescription] = useState("");
  const [adGoal, setAdGoal] = useState(AD_GOAL_SUGGESTIONS[0]);
  const [aspectRatio, setAspectRatio] = useState<VideoAspect>("9:16");
  const [seconds, setSeconds] = useState<VideoSeconds>("8");
  const [videos, setVideos] = useState<Generation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listVideos(24)
      .then((data) => {
        if (!active) return;
        setVideos(data.videos);
        const firstCompleted = data.videos.find(
          (video) => video.status === "completed" && video.result_url,
        );
        setSelectedId(firstCompleted?.id ?? data.videos[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load videos");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!me?.profile.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`generations-videos-${me.profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generations",
          filter: `user_id=eq.${me.profile.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Generation | null;
          if (!row || row.type !== "video") return;

          if (payload.eventType === "DELETE") {
            setVideos((current) =>
              current.filter((video) => video.id !== row.id),
            );
            return;
          }

          setVideos((current) => upsertVideo(current, row));

          if (row.status === "completed" || row.status === "failed") {
            void refresh();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.profile.id, refresh]);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const data = await generateVideo({
        productDescription,
        adGoal,
        aspectRatio,
        seconds,
      });
      setVideos((current) => upsertVideo(current, data.generation));
      setSelectedId(data.generation.id);
      setNotice("Video queued. Status updates live while it renders.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue video");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(video: Generation) {
    if (!video.result_url) return;
    setDownloadingId(video.id);
    setError(null);

    try {
      await downloadVideo(video.result_url, `evanio-ad-${video.id}.mp4`);
    } catch {
      setError("Could not download that video. Try opening it in a new tab.");
    } finally {
      setDownloadingId(null);
    }
  }

  const credits = me?.credits.total ?? 0;
  const selected =
    videos.find((video) => video.id === selectedId) ?? videos[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Videos"
        description="Generate short-form video ads in the background. Status updates live via Supabase Realtime."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form
          onSubmit={handleGenerate}
          className="space-y-5 rounded-2xl border border-border/80 bg-white p-5 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="productDescription">Product description</Label>
            <Textarea
              id="productDescription"
              value={productDescription}
              onChange={(event) => setProductDescription(event.target.value)}
              placeholder="Describe the product, offer, and what should appear on screen."
              rows={5}
              required
              minLength={8}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adGoal">Ad goal</Label>
            <Textarea
              id="adGoal"
              value={adGoal}
              onChange={(event) => setAdGoal(event.target.value)}
              rows={3}
              required
              minLength={4}
              className="resize-y"
            />
            <div className="flex flex-wrap gap-2">
              {AD_GOAL_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setAdGoal(suggestion)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    adGoal === suggestion
                      ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                      : "border-border text-muted-foreground hover:border-brand-accent/40",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aspect ratio</Label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspectRatio(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition",
                    aspectRatio === option.value
                      ? "border-brand-accent bg-brand-accent/10"
                      : "border-border hover:border-brand-accent/40",
                  )}
                >
                  <div className="font-heading text-sm font-semibold text-ink">
                    {option.label}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {option.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeconds(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-center font-heading text-sm font-semibold transition",
                    seconds === option.value
                      ? "border-brand-accent bg-brand-accent/10 text-ink"
                      : "border-border text-muted-foreground hover:border-brand-accent/40",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Cost: 15 credits · Balance: {credits}
          </p>
          <p className="text-xs text-muted-foreground">
            Failed jobs refund credits automatically.
          </p>

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

          <Button
            type="submit"
            disabled={generating || credits < 15}
            className="w-full"
          >
            {generating ? "Queuing…" : "Generate video"}
          </Button>
        </form>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Player
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#ecfdf5,#f8fafc)]">
              {selected?.result_url && selected.status === "completed" ? (
                <video
                  key={selected.id}
                  src={selected.result_url}
                  controls
                  className="mx-auto max-h-[28rem] w-full bg-black object-contain"
                />
              ) : (
                <div className="flex min-h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {selected
                    ? selected.status === "failed"
                      ? "This generation failed. Credits were refunded."
                      : `${statusLabel(selected.status)}…${
                          progressFromJson(selected.result_json) != null
                            ? ` ${progressFromJson(selected.result_json)}%`
                            : ""
                        }`
                    : "Select a completed video to play."}
                </div>
              )}
            </div>
            {selected?.result_url && selected.status === "completed" ? (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingId === selected.id}
                  onClick={() => void handleDownload(selected)}
                >
                  {downloadingId === selected.id ? "Saving…" : "Download"}
                </Button>
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Your videos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live status from the queue and worker.
            </p>

            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : videos.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
                <p className="font-heading text-base font-semibold text-ink">
                  No videos yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Queue your first short-form ad.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {videos.map((video) => {
                  const progress = progressFromJson(video.result_json);
                  const active = selected?.id === video.id;

                  return (
                    <li key={video.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(video.id)}
                        className={cn(
                          "w-full rounded-xl border bg-white px-4 py-3 text-left transition",
                          active
                            ? "border-brand-accent shadow-sm"
                            : "border-border/80 hover:border-brand-accent/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm text-ink">
                            {video.prompt}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              video.status === "completed"
                                ? "bg-emerald-50 text-emerald-800"
                                : video.status === "failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-800",
                            )}
                          >
                            {statusLabel(video.status)}
                            {progress != null &&
                            (video.status === "queued" ||
                              video.status === "processing")
                              ? ` · ${progress}%`
                              : ""}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(video.created_at).toLocaleString()} ·{" "}
                            {video.credits_used} cr
                          </p>
                          {video.result_url && video.status === "completed" ? (
                            <span
                              role="link"
                              tabIndex={0}
                              className="text-[11px] font-medium text-brand-accent"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDownload(video);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleDownload(video);
                                }
                              }}
                            >
                              {downloadingId === video.id
                                ? "Saving…"
                                : "Download"}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
