"use client";

import { useMe } from "@/components/dashboard/me-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/dashboard/skeleton";

export default function SettingsPage() {
  const { me, loading } = useMe();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Account and business details for your Evanio workspace."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[14px] border border-card-border bg-white p-5">
          <p className="text-sm text-muted-text">Profile</p>
          {loading || !me ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-heading text-base font-semibold text-ink">
                {me.profile.full_name || "No name set"}
              </p>
              <p className="mt-1 text-sm text-body">{me.profile.email}</p>
            </>
          )}
        </section>

        <section className="rounded-[14px] border border-card-border bg-white p-5">
          <p className="text-sm text-muted-text">Business</p>
          {loading || !me ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <p className="mt-2 font-heading text-base font-semibold text-ink">
                {me.business?.name}
              </p>
              <p className="mt-1 text-sm text-body">
                {[me.business?.industry, me.business?.website]
                  .filter(Boolean)
                  .join(" · ") || "No website set"}
              </p>
              {me.business?.tone ? (
                <p className="mt-3 text-sm text-muted-text">
                  Tone: {me.business.tone}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
