"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  generateBrandKit,
  getBrandKit,
  updateBrandKit,
  uploadBrandLogo,
  type BrandColors,
  type BrandFonts,
  type BrandKit,
} from "@/lib/api";
import { brandFontOptions } from "@/lib/brand-fonts";
import { cn } from "@/lib/utils";

const emptyColors: BrandColors = {
  primary: "#0F766E",
  secondary: "#134E4A",
  accent: "#F59E0B",
  neutral: "#334155",
  background: "#F8FAFC",
};

const emptyFonts: BrandFonts = {
  heading: "Inter",
  body: "Inter",
};

export function BrandKitPageContent() {
  const { me, refresh } = useMe();
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [colors, setColors] = useState<BrandColors>(emptyColors);
  const [fonts, setFonts] = useState<BrandFonts>(emptyFonts);
  const [tagline, setTagline] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function applyKit(kit: BrandKit) {
    setBrandKit(kit);
    setColors(kit.colors);
    setFonts(kit.fonts);
    setTagline(kit.tagline ?? "");
    setStyleNotes(kit.style_notes ?? "");
    setSelectedLogo(kit.logo_url);
  }

  useEffect(() => {
    let active = true;

    void getBrandKit()
      .then((data) => {
        if (!active) return;
        if (data.brandKit) {
          applyKit(data.brandKit);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load brand kit");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const data = await generateBrandKit();
      applyKit(data.brandKit);
      setNotice("Brand kit generated. Pick a logo and tweak anything you want.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const data = await updateBrandKit({
        colors,
        fonts,
        tagline: tagline.trim() || null,
        style_notes: styleNotes.trim() || null,
        logo_url: selectedLogo,
      });
      applyKit(data.brandKit);
      setNotice("Brand kit saved. Future image and video generations will use it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await uploadBrandLogo(file);
      applyKit(data.brandKit);
      setNotice("Logo uploaded and selected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading brand kit...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Brand Kit"
          description={`Colors, fonts, tagline, and logo for ${me?.business?.name ?? "your business"}. Image and video tools will follow this kit.`}
        />
        <Button
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating
            ? "Generating..."
            : brandKit
              ? "Regenerate kit (8 credits)"
              : "Generate kit (8 credits)"}
        </Button>
      </div>

      {notice ? (
        <p className="border border-brand/30 bg-surface px-4 py-3 text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!brandKit ? (
        <div className="border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-heading text-xl font-semibold text-ink">
            No brand kit yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Generate a palette, fonts, tagline, style notes, and 3 logo options
            from your business profile.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-ink">
                  Logo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick one of the generated options or upload your own.
                </p>
              </div>
              <label className="inline-flex cursor-pointer">
                <span className="sr-only">Upload logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
                <span className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm text-foreground hover:bg-muted">
                  {uploading ? "Uploading..." : "Upload logo"}
                </span>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {brandKit.logo_options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedLogo(option.url)}
                  className={cn(
                    "overflow-hidden border bg-background text-left transition-colors",
                    selectedLogo === option.url
                      ? "border-brand"
                      : "border-border hover:border-brand/40",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.url}
                    alt={option.style}
                    className="aspect-square w-full object-contain bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4 dark:bg-none dark:bg-muted/40"
                  />
                  <div className="border-t border-border px-3 py-2">
                    <p className="text-sm font-medium text-foreground">
                      {option.style}
                    </p>
                    {selectedLogo === option.url ? (
                      <p className="text-xs text-brand">Selected</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click to select</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 border border-border p-5">
              <h2 className="font-heading text-lg font-semibold text-ink">
                Colors
              </h2>
              {(
                [
                  ["primary", "Primary"],
                  ["secondary", "Secondary"],
                  ["accent", "Accent"],
                  ["neutral", "Neutral"],
                  ["background", "Background"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(event) =>
                      setColors((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="size-10 cursor-pointer rounded border border-border bg-transparent p-1"
                    aria-label={label}
                  />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`color-${key}`}>{label}</Label>
                    <Input
                      id={`color-${key}`}
                      value={colors[key]}
                      onChange={(event) =>
                        setColors((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border border-border p-5">
              <h2 className="font-heading text-lg font-semibold text-ink">
                Fonts & voice
              </h2>
              <div className="space-y-2">
                <Label htmlFor="heading-font">Heading font</Label>
                <select
                  id="heading-font"
                  value={fonts.heading}
                  onChange={(event) =>
                    setFonts((current) => ({
                      ...current,
                      heading: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {brandFontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-font">Body font</Label>
                <select
                  id="body-font"
                  value={fonts.body}
                  onChange={(event) =>
                    setFonts((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {brandFontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  placeholder="A short brand promise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style-notes">Style notes</Label>
                <Textarea
                  id="style-notes"
                  rows={5}
                  value={styleNotes}
                  onChange={(event) => setStyleNotes(event.target.value)}
                  placeholder="Visual guidance for ads, photos, and layouts"
                />
              </div>
            </div>
          </section>

          <section className="border border-border bg-surface p-5">
            <h2 className="font-heading text-lg font-semibold text-ink">Preview</h2>
            <div
              className="mt-4 rounded-xl p-6"
              style={{ backgroundColor: colors.background, color: colors.neutral }}
            >
              <div className="flex flex-wrap items-center gap-4">
                {selectedLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedLogo}
                    alt="Selected logo"
                    className="size-16 rounded-lg object-contain"
                  />
                ) : null}
                <div>
                  <p
                    className="text-2xl font-semibold"
                    style={{ color: colors.primary, fontFamily: fonts.heading }}
                  >
                    {me?.business?.name ?? "Your business"}
                  </p>
                  <p style={{ fontFamily: fonts.body }}>
                    {tagline || "Your tagline will appear here"}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(colors).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-2 rounded-md border border-black/5 px-2 py-1 text-xs"
                    style={{ backgroundColor: value, color: colors.neutral }}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : "Save brand kit"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
