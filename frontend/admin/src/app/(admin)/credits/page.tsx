"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TableSkeleton } from "@/components/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCreditsPage } from "@/lib/admin-data";
import type { CreditTransaction } from "@/lib/admin-mock";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 20;

type TxType = CreditTransaction["type"] | "all";

export default function CreditsPage() {
  const [rows, setRows] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TxType>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await loadCreditsPage();
        if (active) setRows(next);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load credits");
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
      if (type !== "all" && row.type !== type) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        (row.feature?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, type]);

  return (
    <div>
      <PageHeader
        title="Credits"
        description="All credit transactions across purchases, deductions, refunds, and admin adjustments."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="credits-search">Search</Label>
          <Input
            id="credits-search"
            className="mt-1.5"
            placeholder="Search email or feature…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor="credits-type">Type</Label>
          <select
            id="credits-type"
            value={type}
            onChange={(event) => setType(event.target.value as TxType)}
            className="mt-1.5 h-9 w-full rounded-[10px] border border-input-border bg-white px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="deduct">Deduct</option>
            <option value="refund">Refund</option>
            <option value="admin_adjust">Admin adjust</option>
            <option value="purchase">Purchase</option>
            <option value="plan_grant">Plan grant</option>
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
            title="No transactions"
            description="No credit activity matches the current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-secondary-text">
                  <tr className="border-b border-row">
                    <th className="px-2 py-3 font-medium">User</th>
                    <th className="px-2 py-3 font-medium">Amount</th>
                    <th className="px-2 py-3 font-medium">Type</th>
                    <th className="px-2 py-3 font-medium">Feature</th>
                    <th className="px-2 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} className="border-b border-row last:border-0">
                      <td className="px-2 py-3">
                        <Link
                          href={`/users/${row.userId}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {row.email}
                        </Link>
                      </td>
                      <td className="px-2 py-3 font-heading font-semibold">
                        {row.amount > 0 ? `+${row.amount}` : row.amount}
                      </td>
                      <td className="px-2 py-3 capitalize">
                        {row.type.replace("_", " ")}
                      </td>
                      <td className="px-2 py-3 text-secondary-text">
                        {row.feature ?? "—"}
                      </td>
                      <td className="px-2 py-3 text-secondary-text">
                        {formatDateTime(row.createdAt)}
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
              label="transactions"
            />
          </>
        )}
      </div>
    </div>
  );
}
