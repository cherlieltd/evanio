"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateAdCopy,
  listAdCopy,
  type AdCopyHistoryItem,
  type AdCopyPlatformFocus,
  type AdCopyResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const GOAL_SUGGESTIONS = [
  "Get more website leads",
  "Sell a seasonal offer",
  "Book more appointments",
  "Grow local awareness",
];

const PLATFORM_OPTIONS: {
  value: AdCopyPlatformFocus;
  label: string;
  hint: string;
}[] = [
  { value: "both", label: "Both", hint: "Facebook + Google" },
  { value: "facebook", label: "Facebook", hint: "Meta focus" },
  { value: "google", label: "Google", hint: "Search / Performance Max" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition hover:border-brand-accent/40 hover:text-ink"
      aria-label="Copy"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-ink">{title}</h3>
        <CopyButton text={items.join("\n")} />
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-3 py-2.5"
          >
            <p className="text-sm leading-relaxed text-ink">{item}</p>
            <CopyButton text={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultPanels({ result }: { result: AdCopyResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <CopyListCard title="Headlines" items={result.headlines} />
        <CopyListCard title="Primary texts" items={result.primaryTexts} />
      </div>

      <CopyListCard title="CTAs" items={result.ctas} />

      <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-semibold text-ink">
          Target audience suggestions
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {result.targetAudiences.map((audience) => (
            <article
              key={`${audience.name}-${audience.description}`}
              className="rounded-xl border border-border/70 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-heading text-sm font-semibold text-ink">
                  {audience.name}
                </h4>
                <CopyButton
                  text={`${audience.name}\n${audience.description}\nPlatforms: ${audience.platforms.join(", ")}`}
                />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {audience.description}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                {audience.platforms.join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-semibold text-ink">
              Budget plan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ~${result.budgetPlan.totalMonthlyUsd.toLocaleString()}/mo total
            </p>
          </div>
          <CopyButton
            text={[
              `Total monthly: $${result.budgetPlan.totalMonthlyUsd}`,
              result.budgetPlan.rationale,
              "",
              "Facebook:",
              `Daily $${result.budgetPlan.facebook.dailyBudgetUsd} · ${result.budgetPlan.facebook.suggestedDurationDays} days · ${result.budgetPlan.facebook.bidStrategy}`,
              result.budgetPlan.facebook.notes,
              "",
              "Google:",
              `Daily $${result.budgetPlan.google.dailyBudgetUsd} · ${result.budgetPlan.google.suggestedDurationDays} days · ${result.budgetPlan.google.bidStrategy}`,
              result.budgetPlan.google.notes,
            ].join("\n")}
          />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {result.budgetPlan.rationale}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              ["Facebook / Meta", result.budgetPlan.facebook],
              ["Google Ads", result.budgetPlan.google],
            ] as const
          ).map(([label, plan]) => (
            <article
              key={label}
              className="rounded-xl border border-border/70 bg-[linear-gradient(180deg,#ffffff,#f5faf7)] p-4"
            >
              <h4 className="font-heading text-sm font-semibold text-ink">
                {label}
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Daily budget</dt>
                  <dd className="font-medium text-ink">
                    ${plan.dailyBudgetUsd}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="font-medium text-ink">
                    {plan.suggestedDurationDays} days
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Bid strategy</dt>
                  <dd className="text-right font-medium text-ink">
                    {plan.bidStrategy}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {plan.notes}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdCopyPageContent() {
  const { me, refresh } = useMe();
  const [offerDescription, setOfferDescription] = useState("");
  const [campaignGoal, setCampaignGoal] = useState(GOAL_SUGGESTIONS[0]);
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState("");
  const [platformFocus, setPlatformFocus] =
    useState<AdCopyPlatformFocus>("both");
  const [result, setResult] = useState<AdCopyResult | null>(null);
  const [history, setHistory] = useState<AdCopyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listAdCopy(20)
      .then((data) => {
        if (!active) return;
        setHistory(data.items);
        const latest = data.items.find((item) => item.result);
        if (latest?.result) setResult(latest.result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setGenerating(true);
    setError(null);
    setNotice(null);

    const budgetValue = monthlyBudgetUsd.trim()
      ? Number(monthlyBudgetUsd)
      : undefined;

    if (
      monthlyBudgetUsd.trim() &&
      (!Number.isFinite(budgetValue) || (budgetValue ?? 0) <= 0)
    ) {
      setError("Monthly budget must be a positive number.");
      setGenerating(false);
      return;
    }

    try {
      const data = await generateAdCopy({
        offerDescription,
        campaignGoal,
        monthlyBudgetUsd: budgetValue,
        platformFocus,
      });
      setResult(data.result);
      setHistory((current) => [
        { generation: data.generation, result: data.result },
        ...current,
      ]);
      setNotice("Campaign plan generated and saved to history.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const credits = me?.credits.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Ad Copy & Campaign Planner"
        description="Generate headlines, primary text, CTAs, audience ideas, and a Facebook + Google budget plan from your brand."
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form
          onSubmit={handleGenerate}
          className="space-y-5 rounded-2xl border border-border/80 bg-white p-5 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="offerDescription">Offer / product</Label>
            <Textarea
              id="offerDescription"
              value={offerDescription}
              onChange={(event) => setOfferDescription(event.target.value)}
              placeholder="What are you promoting? Include offer details, proof points, and constraints."
              rows={5}
              required
              minLength={8}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaignGoal">Campaign goal</Label>
            <Textarea
              id="campaignGoal"
              value={campaignGoal}
              onChange={(event) => setCampaignGoal(event.target.value)}
              rows={3}
              required
              minLength={4}
              className="resize-y"
            />
            <div className="flex flex-wrap gap-2">
              {GOAL_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCampaignGoal(suggestion)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    campaignGoal === suggestion
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
            <Label htmlFor="monthlyBudgetUsd">
              Monthly budget (USD, optional)
            </Label>
            <Input
              id="monthlyBudgetUsd"
              type="number"
              min={1}
              step={1}
              value={monthlyBudgetUsd}
              onChange={(event) => setMonthlyBudgetUsd(event.target.value)}
              placeholder="e.g. 800"
            />
          </div>

          <div className="space-y-2">
            <Label>Platform focus</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlatformFocus(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition",
                    platformFocus === option.value
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

          <p className="text-xs text-muted-foreground">
            Cost: 2 credits · Balance: {credits}
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
            disabled={generating || credits < 2}
            className="w-full"
          >
            {generating ? "Generating…" : "Generate campaign plan"}
          </Button>
        </form>

        <div className="space-y-8">
          <section>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Results
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Copy any line into Meta Ads Manager or Google Ads.
            </p>
            <div className="mt-4">
              {result ? (
                <ResultPanels result={result} />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
                  <p className="font-heading text-base font-semibold text-ink">
                    No plan yet
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Fill in the brief and generate structured ad copy.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold text-ink">
              History
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved generations for this account.
            </p>

            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : history.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nothing saved yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {history.map((item) => (
                  <li key={item.generation.id}>
                    <button
                      type="button"
                      disabled={!item.result}
                      onClick={() => {
                        if (item.result) setResult(item.result);
                      }}
                      className={cn(
                        "w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-left transition",
                        item.result
                          ? "hover:border-brand-accent/40"
                          : "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-2 text-sm text-ink">
                          {item.generation.prompt}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {item.generation.status}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(
                          item.generation.created_at,
                        ).toLocaleString()}{" "}
                        · {item.generation.credits_used} cr
                        {item.result
                          ? ` · ${item.result.headlines.length} headlines`
                          : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
