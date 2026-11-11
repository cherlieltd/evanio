"use client";

import { useState } from "react";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { MeProvider } from "@/components/dashboard/me-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MeProvider>
      <DashboardDataProvider>
        <div className="flex min-h-screen bg-page">
          <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0">
            <DashboardSidebar />
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="w-[240px] max-w-[240px] gap-0 p-0 sm:max-w-[240px]"
              showCloseButton={false}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardTopbar onMenuClick={() => setMobileOpen(true)} />
            <main className="flex-1 px-4 py-6 sm:px-7 sm:py-7">
              <div className="mx-auto w-full max-w-[1200px]">{children}</div>
            </main>
          </div>
        </div>
      </DashboardDataProvider>
    </MeProvider>
  );
}
