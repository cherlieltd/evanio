"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdjustCreditsDialog } from "@/components/adjust-credits-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadUsersPage } from "@/lib/admin-data";
import type { AdminUser, SubscriptionStatus } from "@/lib/admin-mock";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | SubscriptionStatus>("all");
  const [page, setPage] = useState(0);
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await loadUsersPage());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.businessName.toLowerCase().includes(q) ||
        row.fullName.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, status]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search accounts, review plans, and adjust credit balances."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="users-search">Search</Label>
          <Input
            id="users-search"
            className="mt-1.5"
            placeholder="Search email or business…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="users-status">Status</Label>
          <select
            id="users-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | SubscriptionStatus)
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
            title="No users found"
            description="Try another search or clear the status filter."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="text-xs text-secondary-text">
                  <tr className="border-b border-row">
                    <th className="px-2 py-3 font-medium">User</th>
                    <th className="px-2 py-3 font-medium">Plan</th>
                    <th className="px-2 py-3 font-medium">Credits left</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Joined</th>
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
                        {user.suspended ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            Suspended
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 capitalize">{user.plan}</td>
                      <td className="px-2 py-3 font-heading font-semibold">
                        {user.creditsLeft.toLocaleString()}
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-2 py-3 text-secondary-text">
                        {formatDate(user.createdAt)}
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
            <PaginationControls
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              onPageChange={setPage}
              label="users"
            />
          </>
        )}
      </div>

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
