"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { DashboardHomeSkeleton } from "@/components/dashboard/skeleton";
import { CREDIT_COSTS } from "@/config/credits";
import { cn } from "@/lib/utils";
import type { DashboardGeneration } from "@/lib/dashboard-mock";

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const quickActions = [
  {
    href: "/dashboard/images",
    title: "Create ad image",
    description: "Any size, in your brand style",
    cost: `≈ ${CREDIT_COSTS.imageGenerate} credits`,
  },
  {
    href: "/dashboard/videos",
    title: "Create video ad",
    description: "Reels, TikTok, Stories",
    cost: `≈ ${CREDIT_COSTS.videoGenerate} credits`,
  },
  {
    href: "/dashboard/ad-copy",
    title: "Write ad copy",
    description: "Headlines, captions, audiences",
    cost: `≈ ${CREDIT_COSTS.adCopyGenerate} credits`,
  },
  {
    href: "/dashboard/brand-kit",
    title: "Edit brand kit",
    description: "Logo, colors, fonts",
    cost: "Free to edit",
  },
] as const;

function tileStyles(type: DashboardGeneration["type"]) {
  switch (type) {
    case "image":
      return "bg-tile-image text-tile-image-fg";
    case "video":
      return "bg-tile-video text-tile-video-fg";
    case "copy":
      return "bg-tile-copy text-tile-copy-fg";
    case "logo":
    default:
      return "bg-tile-logo text-tile-logo-fg";
  }
}

function tileLabel(item: DashboardGeneration) {
  if (item.type === "video" && item.status !== "completed") {
    return "Video · Rendering";
  }
  if (item.type === "copy") return "Ad copy";
  if (item.type === "logo") return "Logo";
  if (item.type === "image") return "Image";
  return "Video";
}

export function DashboardHome() {
  const { data, loading, error } = useDashboardData();
  const [draft, setDraft] = useState("");
  const greeting = useMemo(() => greetingForNow(), []);

  if (loading && !data) {
    return <DashboardHomeSkeleton />;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error ?? "Unable to load dashboard"}
      </p>
    );
  }

  const used = data.credits.planCreditsUsed;
  const planTotal = data.plan.monthlyCredits;
  const progress = Math.min(100, Math.round((used / planTotal) * 100));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[30px] font-bold tracking-tight text-ink">
          {greeting}
        </h1>
        <p className="mt-1 text-[15px] text-body">
          What do you want to create today?
        </p>
      </div>

      <section aria-label="Quick actions">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-[14px] border border-card-border bg-white p-[18px] transition hover:border-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <p className="font-heading text-base font-semibold text-ink">
                {action.title}
              </p>
              <p className="mt-1 text-sm text-body">{action.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-text">
                {action.cost}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-h-[360px] flex-col rounded-2xl border border-card-border bg-white lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Evi 2.0
            </h2>
            <p className="text-sm text-muted-text">
              {CREDIT_COSTS.eviChatMessage} credit per message
            </p>
          </div>

          <div className="flex min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            {data.eviPreviewMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto rounded-[14px_14px_4px_14px] bg-ink text-white"
                    : "mr-auto rounded-[14px_14px_14px_4px] bg-soft text-ink",
                )}
              >
                {message.content}
              </div>
            ))}

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {["Make ad images", "Write ad copy"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-card-border bg-white px-3 py-1.5 text-xs font-medium text-nav transition hover:bg-soft"
                  onClick={() => setDraft(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <form
            className="flex flex-col gap-2 border-t border-card-border p-4 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/dashboard/evi`;
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="home-evi-input" className="sr-only">
                Ask Evi anything about your business
              </label>
              <input
                id="home-evi-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Evi anything about your business…"
                className="h-11 w-full rounded-[10px] border border-input-border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted-text focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-[10px] bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Send
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-card-border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Recent creations
            </h2>
            <Link
              href="/dashboard/images"
              className="text-sm font-medium text-brand-text hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {data.recentGenerations.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "relative flex h-[110px] items-end overflow-hidden rounded-[14px] p-3 text-sm font-semibold",
                  tileStyles(item.type),
                )}
              >
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <span className="relative z-[1]">{tileLabel(item)}</span>
              </div>
            ))}
          </div>

          {data.recentGenerations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-text">
              No creations yet. Start with an image or ad copy.
            </p>
          ) : null}

          <div className="mt-5 border-t border-card-border pt-4">
            <p className="text-sm font-medium text-ink">Credits this month</p>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Plan credits used this month"
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-text">
              {used.toLocaleString()} of {planTotal.toLocaleString()} plan
              credits used · {data.credits.purchasedCredits.toLocaleString()}{" "}
              purchased
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
