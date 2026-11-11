"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-[230px] flex-col bg-sidebar-bg px-3 py-5 text-sidebar-item",
        className,
      )}
    >
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-6 flex items-start gap-2.5 px-2"
        aria-label="Evanio Admin home"
      >
        <Image
          src="/evi.png"
          alt="Evi"
          width={32}
          height={32}
          className="mt-0.5 size-8 rounded-lg object-cover"
          priority
        />
        <span>
          <span className="block font-heading text-[17px] font-bold text-white">
            Evanio Admin
          </span>
          <span className="block text-xs text-sidebar-sub">admin.evanio.ai</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1" aria-label="Admin">
        {adminNav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition",
                active
                  ? "bg-sidebar-active font-semibold text-white"
                  : "font-medium text-sidebar-item hover:bg-sidebar-active/60 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
