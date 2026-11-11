"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TableSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadGenerationsPage, retryGeneration } from "@/lib/admin-data";
import type { GenerationJob } from "@/lib/admin-mock";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type JobStatus = GenerationJob["status"] | "all";

const statusStyles: Record<GenerationJob["status"], string> = {
  queued: "bg-status-trial-bg text-status-trial-fg",
  processing: "bg-status-pastdue-bg text-status-pastdue-fg",
  completed: "bg-status-active-bg text-status-active-fg",
  failed: "bg-status-canceled-bg text-status-canceled-fg",
};

function GenerationsContent() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as JobStatus | null) ?? "all";
  const [rows, setRows] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<JobStatus>(
    ["queued", "processing", "completed", "failed", "all"].includes(initialStatus)
      ? initialStatus
      : "all",
  );
  const [page, setPage] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await loadGenerationsPage(status === "all" ? undefined : status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load generations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const next = searchParams.get("status");
    if (next && ["queued", "processing", "completed", "failed"].includes(next)) {
      setStatus(next as GenerationJob["status"]);
    }
  }, [searchParams]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        row.prompt.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, status]);

  async function onRetry(id: string) {
    setRetryingId(id);
    setError(null);
    try {
      await retryGeneration(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry job");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Generations"
        description="Image, video, and copy jobs across the platform."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <Label htmlFor="gens-search">Search</Label>
          <Input
            id="gens-search"
            className="mt-1.5"
            placeholder="Search email, prompt, or type…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Label htmlFor="gens-status">Status</Label>
          <select
            id="gens-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as JobStatus)}
            className="mt-1.5 h-9 w-full rounded-[10px] border border-input-border bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
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
            title="No generations"
            description="No jobs match the current filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs text-secondary-text">
                  <tr className="border-b border-row">
                    <th className="px-2 py-3 font-medium">User</th>
                    <th className="px-2 py-3 font-medium">Type</th>
                    <th className="px-2 py-3 font-medium">Prompt</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Credits</th>
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((job) => (
                    <tr key={job.id} className="border-b border-row last:border-0">
                      <td className="px-2 py-3">
                        <Link
                          href={`/users/${job.userId}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {job.email}
                        </Link>
                      </td>
                      <td className="px-2 py-3 capitalize">{job.type}</td>
                      <td className="max-w-[280px] truncate px-2 py-3">
                        {job.prompt}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            statusStyles[job.status],
                          )}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-heading font-semibold">
                        {job.creditsUsed}
                      </td>
                      <td className="px-2 py-3 text-secondary-text">
                        {formatDateTime(job.createdAt)}
                      </td>
                      <td className="px-2 py-3">
                        {job.status === "failed" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={retryingId === job.id}
                            onClick={() => void onRetry(job.id)}
                          >
                            {retryingId === job.id ? "Retrying…" : "Retry"}
                          </Button>
                        ) : (
                          <span className="text-xs text-secondary-text">—</span>
                        )}
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
              label="jobs"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function GenerationsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Generations"
            description="Image, video, and copy jobs across the platform."
          />
          <div className="rounded-2xl border border-card-border bg-white p-5">
            <TableSkeleton rows={8} />
          </div>
        </div>
      }
    >
      <GenerationsContent />
    </Suspense>
  );
}
