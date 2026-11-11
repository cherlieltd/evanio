"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateImage,
  listImages,
  type Generation,
  type ImageSize,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const SIZE_OPTIONS: { value: ImageSize; label: string; hint: string }[] = [
  { value: "1:1", label: "1:1", hint: "Feed / square" },
  { value: "9:16", label: "9:16", hint: "Stories / Reels" },
  { value: "16:9", label: "16:9", hint: "Landscape / YouTube" },
];

const AD_GOAL_SUGGESTIONS = [
  "Drive website visits",
  "Promote a limited-time offer",
  "Build brand awareness",
  "Get more local foot traffic",
];

async function downloadImage(url: string, filename: string) {
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

export function ImagesPageContent() {
  const { me, refresh } = useMe();
  const [productDescription, setProductDescription] = useState("");
  const [adGoal, setAdGoal] = useState(AD_GOAL_SUGGESTIONS[0]);
  const [size, setSize] = useState<ImageSize>("1:1");
  const [images, setImages] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void listImages(24)
      .then((data) => {
        if (!active) return;
        setImages(data.images);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load images");
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

    try {
      const data = await generateImage({
        productDescription,
        adGoal,
        size,
      });
      setImages((current) => [data.generation, ...current]);
      setNotice("Image generated and saved to your gallery.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(image: Generation) {
    if (!image.result_url) return;
    setDownloadingId(image.id);
    setError(null);

    try {
      await downloadImage(image.result_url, `evanio-ad-${image.id}.png`);
    } catch {
      setError("Could not download that image. Try opening it in a new tab.");
    } finally {
      setDownloadingId(null);
    }
  }

  const credits = me?.credits.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Images"
        description="Generate on-brand ad images for Meta, Google, and social. Uses your business profile and brand kit."
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
              placeholder="Describe the product, offer, or service. Include key visual details."
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
            <Label>Size</Label>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSize(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition",
                    size === option.value
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
            Cost: 3 credits · Balance: {credits}
          </p>
          <p className="text-xs text-muted-foreground">
            Blocked: celebrity likenesses, other brands&apos; trademarks/logos,
            and adult content.
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

          <Button type="submit" disabled={generating || credits < 3} className="w-full">
            {generating ? "Generating…" : "Generate image"}
          </Button>
        </form>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-ink">
                Gallery
              </h2>
              <p className="text-sm text-muted-foreground">
                Past image generations for this account.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading gallery…</p>
          ) : images.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
              <p className="font-heading text-base font-semibold text-ink">
                No images yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate your first on-brand ad creative.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((image) => (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm"
                >
                  <div className="relative aspect-square bg-[linear-gradient(135deg,#ecfdf5,#f8fafc)]">
                    {image.result_url && image.status === "completed" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.result_url}
                        alt="Generated ad"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                        {image.status === "failed"
                          ? "Generation failed"
                          : image.status === "processing"
                            ? "Processing…"
                            : "No preview"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(image.created_at).toLocaleString()} ·{" "}
                        {image.credits_used} cr
                      </span>
                      {image.result_url ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === image.id}
                          onClick={() => void handleDownload(image)}
                        >
                          {downloadingId === image.id ? "Saving…" : "Download"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
