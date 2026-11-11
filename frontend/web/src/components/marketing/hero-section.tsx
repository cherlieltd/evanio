import Link from "next/link";
import { Play } from "lucide-react";

function HeroPreview() {
  return (
    <div className="mx-auto mt-14 w-full max-w-[980px] rounded-3xl border border-line bg-white p-3 shadow-[0_30px_80px_-40px_rgba(15,26,23,0.35)] sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="size-2.5 rounded-full bg-line" aria-hidden />
        <span className="size-2.5 rounded-full bg-line" aria-hidden />
        <span className="size-2.5 rounded-full bg-line" aria-hidden />
        <span className="ml-2 text-xs font-medium text-muted-text">
          Evanio workspace
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="rounded-2xl border border-line bg-page p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Evi 2.0
          </p>
          <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-sm leading-relaxed text-body">
              I can draft 5 Meta ads for your spring promo and match your brand
              kit colors.
            </p>
          </div>
          <div className="mt-3 rounded-full border border-pill-border bg-white px-3 py-2 text-xs text-muted-text">
            Ask Evi anything about your marketing...
          </div>
        </div>

        <div className="rounded-2xl bg-ad-yellow p-4 text-ad-yellow-fg">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Ad preview
          </p>
          <p className="mt-6 font-heading text-3xl font-bold leading-none tracking-tight">
            Buy 1
            <br />
            Get 1
          </p>
          <p className="mt-3 text-sm font-medium">Weekend special for locals</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-lavender p-4 text-lavender-fg">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            Video ad
          </p>
          <p className="mt-8 font-heading text-xl font-bold leading-tight">
            15s story creative
          </p>
          <div className="absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/80 text-lavender-fg">
            <Play className="size-4 fill-current" aria-hidden />
            <span className="sr-only">Play preview</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="marketing-grid-bg overflow-hidden pb-16 pt-[104px]">
      <div className="marketing-container text-center">
        <p className="mx-auto inline-flex items-center rounded-full border border-pill-border bg-white px-3 py-1 text-xs font-semibold tracking-wide text-ink-2">
          <span className="mr-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
            NEW
          </span>
          AI-driven social media ads
        </p>

        <h1
          id="evi"
          className="heading-display mx-auto mt-6 max-w-4xl scroll-mt-28 text-[40px] text-ink sm:text-[56px]"
        >
          Your whole marketing team.{" "}
          <span className="text-brand">One AI.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-body sm:text-lg">
          Automate content, ads, and your brand voice — without a marketing team
          or design degree.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Start creating free →
          </Link>
          <Link
            href="/#how"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-pill-border bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-chip"
          >
            <Play className="size-4 fill-current" aria-hidden />
            See how it works
          </Link>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
