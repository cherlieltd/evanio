"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdjustCreditsDialog } from "@/components/adjust-credits-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Skeleton, TableSkeleton } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { loadUserDetail, suspendUser } from "@/lib/admin-data";
import type {
  AdminUser,
  CreditTransaction,
  GenerationJob,
} from "@/lib/admin-mock";
import { formatDate, formatDateTime } from "@/lib/format";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [generations, setGenerations] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const details = await loadUserDetail(params.id);
      setUser(details.user);
      setTransactions(details.transactions);
      setGenerations(details.generations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const recentJobs = useMemo(() => generations.slice(0, 8), [generations]);

  async function onToggleSuspend() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await suspendUser(user.id, !user.suspended);
      setUser({ ...user, suspended: !user.suspended });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <PageHeader title="User not found" description="This account is not in the mock dataset." />
        <EmptyState
          title="Missing user"
          description="Return to the users list and pick another account."
        />
        <div className="mt-4">
          <Link
            href="/users"
            className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={user.businessName}
        description={user.email}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setAdjustOpen(true)}>
              Adjust credits
            </Button>
            <Button
              type="button"
              variant={user.suspended ? "outline" : "destructive"}
              disabled={busy}
              onClick={() => void onToggleSuspend()}
            >
              {user.suspended ? "Unsuspend user" : "Suspend user"}
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Full name</dt>
              <dd className="font-medium text-ink">{user.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Role</dt>
              <dd className="font-medium capitalize text-ink">{user.role}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Joined</dt>
              <dd className="font-medium text-ink">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Account</dt>
              <dd className="font-medium text-ink">
                {user.suspended ? "Suspended" : "Active"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Business info
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Business</dt>
              <dd className="font-medium text-ink">{user.businessName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Industry</dt>
              <dd className="font-medium text-ink">{user.industry}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Website</dt>
              <dd className="font-medium text-ink">
                {user.website ? (
                  <a
                    href={user.website}
                    className="text-brand-text hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">Plan</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Plan</dt>
              <dd className="font-medium capitalize text-ink">{user.plan}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Status</dt>
              <dd>
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Stripe customer</dt>
              <dd className="font-mono text-xs text-ink">
                {user.stripeCustomerId ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Renewal</dt>
              <dd className="font-medium text-ink">
                {formatDate(user.renewalDate)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-card-border bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Credit balance
          </h2>
          <p className="mt-4 font-heading text-[30px] font-bold tracking-tight text-ink">
            {user.creditsLeft.toLocaleString()}
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Plan credits</dt>
              <dd className="font-medium text-ink">
                {user.planCredits.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-secondary-text">Purchased credits</dt>
              <dd className="font-medium text-ink">
                {user.purchasedCredits.toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-card-border bg-white p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">
          Credit transaction history
        </h2>
        {transactions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No transactions"
              description="Credit activity for this user will appear here."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-secondary-text">
                <tr className="border-b border-row">
                  <th className="px-2 py-3 font-medium">Amount</th>
                  <th className="px-2 py-3 font-medium">Type</th>
                  <th className="px-2 py-3 font-medium">Feature</th>
                  <th className="px-2 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-b border-row last:border-0">
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
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-card-border bg-white p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">
          Recent generations
        </h2>
        {recentJobs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No generations"
              description="Recent image, video, and copy jobs will show here."
            />
          </div>
        ) : loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-secondary-text">
                <tr className="border-b border-row">
                  <th className="px-2 py-3 font-medium">Type</th>
                  <th className="px-2 py-3 font-medium">Prompt</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Credits</th>
                  <th className="px-2 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} className="border-b border-row last:border-0">
                    <td className="px-2 py-3 capitalize">{job.type}</td>
                    <td className="px-2 py-3">{job.prompt}</td>
                    <td className="px-2 py-3 capitalize">{job.status}</td>
                    <td className="px-2 py-3 font-heading font-semibold">
                      {job.creditsUsed}
                    </td>
                    <td className="px-2 py-3 text-secondary-text">
                      {formatDateTime(job.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdjustCreditsDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        userId={user.id}
        userLabel={user.businessName}
        onSaved={() => void load()}
      />
    </div>
  );
}
