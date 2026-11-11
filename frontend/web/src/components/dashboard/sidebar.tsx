"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNav } from "@/lib/dashboard-nav";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";

type DashboardSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebar({
  onNavigate,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data } = useDashboardData();

  return (
    <aside
      className={cn(
        "flex h-full w-[240px] flex-col border-r border-card-border bg-white px-[14px] py-5",
        className,
      )}
    >
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-5 flex items-center gap-2.5 px-1"
        aria-label="Evanio.ai home"
      >
        <Image
          src="/evi.png"
          alt="Evi"
          width={30}
          height={30}
          className="size-[30px] rounded-lg object-cover"
          priority
        />
        <span className="font-heading text-[18px] font-bold tracking-tight text-ink">
          Evanio.ai
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Dashboard">
        {dashboardNav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-[11px] text-[15px] transition-colors",
                active
                  ? "bg-brand-soft font-semibold text-brand-text"
                  : "font-medium text-nav hover:bg-soft",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.comingSoon ? (
                <span className="rounded-full bg-track px-1.5 py-0.5 text-[10px] font-medium text-muted-text">
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl bg-soft p-3.5">
        <p className="text-xs font-medium text-muted-text">Current plan</p>
        <p className="mt-1 font-heading text-sm font-semibold text-ink">
          {data
            ? `${data.plan.name} · ${data.plan.priceLabel}`
            : "Loading…"}
        </p>
        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          className="mt-2 inline-block text-sm font-medium text-brand-text hover:underline"
        >
          Manage billing
        </Link>
      </div>
    </aside>
  );
}
