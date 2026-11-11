"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdjustCreditsDialog } from "@/components/adjust-credits-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Skeleton, TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadOverviewPage } from "@/lib/admin-data";
import type {
  AdminDateRange,
  AdminOverview,
  AdminUser,
} from "@/lib/admin-mock";

const PAGE_SIZE = 20;

function exportUsersCsv(rows: AdminUser[]) {
  const header = ["business", "email", "plan", "credits", "status"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        JSON.stringify(row.businessName),
        JSON.stringify(row.email),
        row.plan,
        row.creditsLeft,
        row.status,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "evanio-admin-users.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function OverviewPage() {
  const [range, setRange] = useState<AdminDateRange>("30d");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await loadOverviewPage();
      void range;
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const filtered = useMemo(() => {
    const rows = data?.users ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.email.toLowerCase().includes(q) ||
        row.businessName.toLowerCase().includes(q) ||
        row.fullName.toLowerCase().includes(q),
    );
  }, [data?.users, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query]);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Revenue, subscribers, credit burn, and account health."
        actions={
          <>
            <label htmlFor="overview-range" className="sr-only">
              Date range
            </label>
            <select
              id="overview-range"
              value={range}
              onChange={(event) => setRange(event.target.value as AdminDateRange)}
              className="h-9 rounded-[10px] border border-input-border bg-white px-3 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button
              type="button"
              className="bg-ink text-white hover:bg-ink/90"
              onClick={() => data && exportUsersCsv(data.users)}
              disabled={!data}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {(
          [
            {
              label: "Monthly recurring revenue",
              value: loading || !data ? null : `$${data.mrr.toLocaleString()}`,
              sub: "From active subscriptions",
            },
            {
              label: "Active subscribers",
              value: loading || !data ? null : data.activeSubscribers.toLocaleString(),
              sub: data?.planMix ?? "Starter · Pro · Business",
            },
            {
              label: "Credits used today",
              value: loading || !data ? null : data.creditsUsedToday.toLocaleString(),
              sub: "All features",
            },
            {
              label: "Failed generations",
              value:
                loading || !data
                  ? null
                  : data.aiCostTodayUsd.toLocaleString(),
              sub: "Open queue for refunded video jobs",
            },
          ] as const
        ).map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-card-border bg-white p-5"
          >
            <p className="text-sm text-secondary-text">{card.label}</p>
            {card.value == null ? (
              <Skeleton className="mt-3 h-9 w-28" />
            ) : (
              <p className="mt-2 font-heading text-[30px] font-bold tracking-tight text-ink">
                {card.value}
              </p>
            )}
            <p className="mt-2 text-sm text-secondary-text">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-card-border bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-heading text-lg font-semibold text-ink">Users</h2>
            <div className="w-full sm:max-w-xs">
              <Label htmlFor="overview-user-search">Search email</Label>
              <Input
                id="overview-user-search"
                className="mt-1.5"
                placeholder="Search email…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : pageRows.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Try a different search or widen the date range."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-secondary-text">
                    <tr className="border-b border-row">
                      <th className="px-2 py-3 font-medium">User</th>
                      <th className="px-2 py-3 font-medium">Plan</th>
                      <th className="px-2 py-3 font-medium">Credits left</th>
                      <th className="px-2 py-3 font-medium">Status</th>
                      <th className="px-2 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((user) => (
                      <tr key={user.id} className="border-b border-row last:border-0">
                        <td className="px-2 py-3">
                          <Link
                            href={`/users/${user.id}`}
                            className="font-semibold text-ink hover:underline"
                          >
                            {user.businessName}
                          </Link>
                          <p className="text-xs text-secondary-text">{user.email}</p>
                        </td>
                        <td className="px-2 py-3 capitalize">{user.plan}</td>
                        <td className="px-2 py-3 font-heading font-semibold">
                          {user.creditsLeft.toLocaleString()}
                        </td>
                        <td className="px-2 py-3">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-2 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAdjustUser(user)}
                          >
                            Adjust credits
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-secondary-text">
                  Page {page + 1} of {pageCount} · {filtered.length} users
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((value) => Math.max(0, value - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount - 1}
                    onClick={() =>
                      setPage((value) => Math.min(pageCount - 1, value + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Credits used by feature
          </h2>
          {loading || !data ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.featureUsage.map((row) => (
                <li key={row.feature}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{row.feature}</span>
                    <span className="text-secondary-text">{row.percent}%</span>
                  </div>
                  <div className="mt-2 h-[8px] overflow-hidden rounded-full bg-row">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${row.percent}%` }}
                      aria-hidden
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-row pt-4">
            <h3 className="font-heading text-sm font-semibold text-ink">
              Failed generations
            </h3>
            <p className="mt-2 text-sm text-secondary-text">
              Video jobs that failed are refunded automatically. Review them
              here.
            </p>
            <Link
              href="/generations?status=failed"
              className="mt-3 inline-block text-sm font-semibold text-brand-text hover:underline"
            >
              Open queue
            </Link>
          </div>
        </div>
      </section>

      {adjustUser ? (
        <AdjustCreditsDialog
          open={Boolean(adjustUser)}
          onOpenChange={(open) => {
            if (!open) setAdjustUser(null);
          }}
          userId={adjustUser.id}
          userLabel={adjustUser.businessName}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
