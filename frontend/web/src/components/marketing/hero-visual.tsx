export function HeroVisual() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="marketing-grid absolute inset-0 opacity-40 dark:opacity-25" />
      <div className="animate-drift absolute -left-[12%] top-[-18%] h-[70%] w-[70%] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--brand)_28%,transparent),transparent_68%)]" />
      <div className="animate-drift absolute right-[-18%] bottom-[-22%] h-[65%] w-[65%] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--mist)_90%,transparent),transparent_70%)] [animation-delay:-6s]" />

      <div className="absolute inset-x-0 bottom-0 top-[42%] sm:top-[38%]">
        <div className="mx-auto h-full max-w-6xl px-4 sm:px-6">
          <div className="relative h-full overflow-hidden rounded-t-[1.5rem] border border-border/80 border-b-0 bg-surface/80 shadow-[0_-20px_60px_-40px_color-mix(in_oklch,var(--ink)_25%,transparent)] backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="ml-3 text-xs text-muted-foreground">
                Evanio workspace
              </span>
            </div>
            <div className="grid h-[calc(100%-2.75rem)] grid-cols-12 gap-3 p-3 sm:p-4">
              <div className="col-span-4 hidden rounded-lg bg-background/70 p-3 sm:block">
                <div className="mb-3 h-2.5 w-16 rounded bg-brand/30" />
                <div className="space-y-2">
                  <div className="h-8 rounded-md bg-mist/80" />
                  <div className="h-8 rounded-md bg-muted" />
                  <div className="h-8 rounded-md bg-muted" />
                  <div className="h-8 rounded-md bg-muted" />
                </div>
              </div>
              <div className="col-span-12 space-y-3 rounded-lg bg-background/70 p-3 sm:col-span-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-3 w-28 rounded bg-brand/40" />
                  <div className="h-7 w-20 rounded-md bg-brand/80" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="aspect-[4/5] rounded-lg bg-[linear-gradient(160deg,color-mix(in_oklch,var(--brand)_35%,white),color-mix(in_oklch,var(--mist)_80%,transparent))]" />
                  <div className="aspect-[4/5] rounded-lg bg-[linear-gradient(160deg,color-mix(in_oklch,var(--ink)_18%,white),color-mix(in_oklch,var(--brand)_20%,transparent))]" />
                  <div className="hidden aspect-[4/5] rounded-lg bg-[linear-gradient(160deg,color-mix(in_oklch,var(--mist)_90%,white),color-mix(in_oklch,var(--brand)_25%,transparent))] sm:block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
