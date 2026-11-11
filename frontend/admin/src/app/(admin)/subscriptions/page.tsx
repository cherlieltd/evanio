"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSubscriptionsPage } from "@/lib/admin-data";
import type { AdminUser, SubscriptionStatus } from "@/lib/admin-mock";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"all" | "starter" | "pro" | "business">("all");
  const [status, setStatus] = useState<"all" | SubscriptionStatus>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadSubscriptionsPage();
        if (active) setRows(next);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load subscriptions");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (plan !== "all" && row.plan !== plan) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.businessName.toLowerCase().includes(q) ||
        (row.stripeCustomerId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query, plan, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, plan, status]);

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Filter by plan and status. Stripe customer IDs and renewal dates."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="subs-search">Search</Label>
          <Input
            id="subs-search"
            className="mt-1.5"
            placeholder="Email, business, Stripe id…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="subs-plan">Plan</Label>
          <select
            id="subs-plan"
            value={plan}
            onChange={(event) =>
              setPlan(event.target.value as typeof plan)
            }
            className="mt-1.5 h-9 w-full rounded-[10px] border border-input-border bg-white px-3 text-sm"
          >
            <option value="all">All plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </div>
        <div>
          <Label htmlFor="subs-status">Status</Label>
          <select
            id="subs-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as typeof status)
            }
            className="mt-1.5 h-9 w-full rounded-[10px] border border-input-border bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trial</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-card-border bg-white p-5">
        {loading ? (
          <TableSkeleton rows={8} />
        ) : pageRows.length === 0 ? (
          <EmptyState
            title="No subscriptions"
            description="No subscriptions match the current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="text-xs text-secondary-text">
                  <tr className="border-b border-row">
                    <th className="px-2 py-3 font-medium">User</th>
                    <th className="px-2 py-3 font-medium">Plan</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Stripe customer</th>
                    <th className="px-2 py-3 font-medium">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-b border-row last:border-0">
                      <td className="px-2 py-3">
                        <Link
                          href={`/users/${row.id}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {row.businessName}
                        </Link>
                        <p className="text-xs text-secondary-text">{row.email}</p>
                      </td>
                      <td className="px-2 py-3 capitalize">{row.plan}</td>
                      <td className="px-2 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-2 py-3 font-mono text-xs">
                        {row.stripeCustomerId ?? "—"}
                      </td>
                      <td className="px-2 py-3 text-secondary-text">
                        {formatDate(row.renewalDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              onPageChange={setPage}
              label="subscriptions"
            />
          </>
        )}
      </div>
    </div>
  );
}
