"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadSettingsPage, saveSettingsPage } from "@/lib/admin-data";
import type {
  CreditCostConfig,
  CreditPackConfig,
  PlanConfig,
} from "@/lib/admin-mock";

export default function SettingsPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [packs, setPacks] = useState<CreditPackConfig[]>([]);
  const [costs, setCosts] = useState<CreditCostConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadSettingsPage();
        if (!active) return;
        setPlans(next.plans);
        setPacks(next.creditPacks);
        setCosts(next.creditCosts);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const next = await saveSettingsPage({
        plans,
        creditPacks: packs,
      });
      setPlans(next.plans);
      setPacks(next.creditPacks);
      setCosts(next.creditCosts);
      setNotice("Billing settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" description="Plans, credit packs, and feature costs." />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Edit plans, credit packs, and credit cost per feature."
      />

      <form onSubmit={onSave} className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm text-status-active-fg" role="status">
            {notice}
          </p>
        ) : null}

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">Plans</h2>
          <div className="mt-4 space-y-6">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className="grid gap-3 border-b border-row pb-6 last:border-0 last:pb-0 md:grid-cols-2"
              >
                <div>
                  <Label htmlFor={`plan-name-${plan.id}`}>Name</Label>
                  <Input
                    id={`plan-name-${plan.id}`}
                    className="mt-1.5"
                    value={plan.name}
                    onChange={(event) => {
                      const next = [...plans];
                      next[index] = { ...plan, name: event.target.value };
                      setPlans(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`plan-price-${plan.id}`}>Price (USD)</Label>
                  <Input
                    id={`plan-price-${plan.id}`}
                    className="mt-1.5"
                    type="number"
                    min={0}
                    value={plan.amountUsd}
                    onChange={(event) => {
                      const next = [...plans];
                      next[index] = {
                        ...plan,
                        amountUsd: Number(event.target.value),
                      };
                      setPlans(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`plan-credits-${plan.id}`}>
                    Monthly credits
                  </Label>
                  <Input
                    id={`plan-credits-${plan.id}`}
                    className="mt-1.5"
                    type="number"
                    min={0}
                    value={plan.monthlyCredits}
                    onChange={(event) => {
                      const next = [...plans];
                      next[index] = {
                        ...plan,
                        monthlyCredits: Number(event.target.value),
                      };
                      setPlans(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`plan-blurb-${plan.id}`}>Blurb</Label>
                  <Textarea
                    id={`plan-blurb-${plan.id}`}
                    className="mt-1.5"
                    value={plan.blurb}
                    onChange={(event) => {
                      const next = [...plans];
                      next[index] = { ...plan, blurb: event.target.value };
                      setPlans(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Credit packs
          </h2>
          <div className="mt-4 space-y-6">
            {packs.map((pack, index) => (
              <div
                key={pack.id}
                className="grid gap-3 border-b border-row pb-6 last:border-0 last:pb-0 md:grid-cols-3"
              >
                <div>
                  <Label htmlFor={`pack-label-${pack.id}`}>Label</Label>
                  <Input
                    id={`pack-label-${pack.id}`}
                    className="mt-1.5"
                    value={pack.label}
                    onChange={(event) => {
                      const next = [...packs];
                      next[index] = { ...pack, label: event.target.value };
                      setPacks(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`pack-credits-${pack.id}`}>Credits</Label>
                  <Input
                    id={`pack-credits-${pack.id}`}
                    className="mt-1.5"
                    type="number"
                    min={0}
                    value={pack.credits}
                    onChange={(event) => {
                      const next = [...packs];
                      next[index] = {
                        ...pack,
                        credits: Number(event.target.value),
                      };
                      setPacks(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`pack-price-${pack.id}`}>Price (USD)</Label>
                  <Input
                    id={`pack-price-${pack.id}`}
                    className="mt-1.5"
                    type="number"
                    min={0}
                    value={pack.amountUsd}
                    onChange={(event) => {
                      const next = [...packs];
                      next[index] = {
                        ...pack,
                        amountUsd: Number(event.target.value),
                      };
                      setPacks(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Credit cost per feature
          </h2>
          <p className="mt-2 text-sm text-secondary-text">
            Feature costs are defined in backend config and shown here for
            reference.
          </p>
          <div className="mt-4 space-y-4">
            {costs.map((cost) => (
              <div
                key={cost.key}
                className="grid gap-3 border-b border-row pb-4 last:border-0 last:pb-0 sm:grid-cols-[1fr_160px]"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{cost.feature}</p>
                  <p className="text-xs text-secondary-text">{cost.key}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-text">Credits</p>
                  <p className="font-heading text-lg font-semibold text-ink">
                    {cost.credits}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-ink text-white hover:bg-ink/90">
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
