"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBusiness, getMe } from "@/lib/api";
import {
  brandTones,
  emptyOnboardingData,
  industries,
  type OnboardingData,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "Your business",
    description: "Tell us who you are so Evanio can tailor campaigns.",
  },
  {
    id: 2,
    title: "What you sell",
    description: "Describe the offer and who it’s for.",
  },
  {
    id: 3,
    title: "Brand tone",
    description: "Pick the voice Evi should write and design in.",
  },
] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(emptyOnboardingData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    void getMe()
      .then((me) => {
        if (!active) return;
        if (me.business) {
          router.replace("/dashboard");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      if (!data.name.trim()) return "Business name is required.";
      if (!data.industry.trim()) return "Select an industry.";
    }
    if (currentStep === 2) {
      if (!data.description.trim()) return "Tell us what you sell.";
      if (!data.target_audience.trim()) return "Describe your target audience.";
    }
    if (currentStep === 3) {
      if (!data.tone.trim()) return "Select a brand tone.";
    }
    return null;
  }

  async function handleNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }

    setLoading(true);
    try {
      await createBusiness({
        name: data.name.trim(),
        website: data.website.trim(),
        industry: data.industry,
        description: data.description.trim(),
        target_audience: data.target_audience.trim(),
        tone: data.tone,
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save business");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-muted-foreground">Loading onboarding...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-brand">Onboarding</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-ink">
          {steps[step - 1].title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {steps[step - 1].description}
        </p>
      </div>

      <div className="mb-8 flex gap-2">
        {steps.map((item) => (
          <div
            key={item.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              item.id <= step ? "bg-brand" : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="space-y-5 border border-border bg-background p-6 sm:p-7">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Acme Coffee Co."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={data.website}
                onChange={(event) => update("website", event.target.value)}
                placeholder="https://acmecoffee.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                value={data.industry}
                onChange={(event) => update("industry", event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="description">What do you sell?</Label>
              <Textarea
                id="description"
                rows={4}
                value={data.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Specialty coffee subscriptions and café experiences for busy professionals."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Target audience</Label>
              <Textarea
                id="audience"
                rows={4}
                value={data.target_audience}
                onChange={(event) => update("target_audience", event.target.value)}
                placeholder="Local remote workers and young professionals who care about quality beans."
                required
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <Label>Brand tone</Label>
            <div className="grid gap-2">
              {brandTones.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => update("tone", tone)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                    data.tone === tone
                      ? "border-brand bg-surface text-foreground"
                      : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
                  )}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 1 || loading}
            onClick={() => {
              setError(null);
              setStep((value) => Math.max(1, value - 1));
            }}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => {
              void handleNext();
            }}
          >
            {step === 3 ? (loading ? "Saving..." : "Finish") : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
