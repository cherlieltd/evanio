"use client";

import Link from "next/link";
import { Coins, Menu } from "lucide-react";
import { AvatarMenu } from "@/components/dashboard/avatar-menu";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { useMe } from "@/components/dashboard/me-provider";

type DashboardTopbarProps = {
  onMenuClick: () => void;
};

function initialsFromName(name: string | null | undefined, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
  }
  return email.slice(0, 2).toUpperCase();
}

export function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  const { data, loading } = useDashboardData();
  const { me } = useMe();

  const businessName =
    me?.business?.name ?? data?.business.name ?? (loading ? "…" : "Your business");
  const credits =
    me?.credits.total ?? data?.credits.total ?? 0;
  const initials = me
    ? initialsFromName(me.profile.full_name, me.profile.email)
    : (data?.user.initials ?? "U");

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-card-border bg-white px-4 py-3.5 sm:px-7">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-[10px] text-nav transition hover:bg-soft lg:hidden"
        aria-label="Open navigation menu"
        onClick={onMenuClick}
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-text">Business</p>
        <p className="truncate font-heading text-sm font-bold text-ink sm:text-base">
          {businessName}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-text"
          aria-label={`${credits.toLocaleString()} credits available`}
        >
          <Coins className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">
            {loading && !me ? "…" : `${credits.toLocaleString()} credits`}
          </span>
          <span className="sm:hidden">
            {loading && !me ? "…" : credits.toLocaleString()}
          </span>
        </div>

        <Link
          href="/dashboard/billing#credits"
          className="inline-flex h-9 items-center justify-center rounded-[10px] bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="sm:hidden">Buy</span>
          <span className="hidden sm:inline">Buy credits</span>
        </Link>

        <AvatarMenu initials={initials} label="Open account menu" />
      </div>
    </header>
  );
}
