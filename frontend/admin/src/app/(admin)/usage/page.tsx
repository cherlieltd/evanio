"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/skeleton";
import { loadUsagePage } from "@/lib/admin-data";
import type { FeatureUsage } from "@/lib/admin-mock";

export default function UsagePage() {
  const [features, setFeatures] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadUsagePage();
        if (!active) return;
        setFeatures(next.featureUsage);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load usage");
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

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Credits used by feature across recent transactions."
      />

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-card-border bg-white p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">
          Credits by feature
        </h2>
        {loading ? (
          <Skeleton className="mt-6 h-72 w-full" />
        ) : features.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No usage data"
              description="Credit usage by feature will appear here once customers generate content."
            />
          </div>
        ) : (
          <div
            className="mt-6 h-72 w-full"
            role="img"
            aria-label="Bar chart of credits by feature"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={features}>
                <CartesianGrid stroke="#EDEDE8" strokeDasharray="3 3" />
                <XAxis dataKey="feature" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="credits"
                  name="Credits"
                  fill="#4F46E5"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
