"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAdminMe } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function gate() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const me = await getAdminMe();
        if (!active) return;

        if (me.profile.role !== "admin") {
          await supabase.auth.signOut();
          setDenied(true);
          setReady(true);
          return;
        }

        setAdminEmail(me.profile.email);
        setReady(true);
      } catch {
        const supabase = createClient();
        await supabase.auth.signOut();
        if (!active) return;
        setDenied(true);
        setReady(true);
      }
    }

    void gate();
    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page p-6">
        <p className="text-sm text-secondary-text">Checking admin access…</p>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page p-6">
        <div className="max-w-md rounded-2xl border border-card-border bg-white p-6 text-center shadow-sm">
          <h1 className="font-heading text-xl font-semibold text-ink">
            You do not have access
          </h1>
          <p className="mt-2 text-sm text-secondary-text">
            This console is limited to accounts with the admin role. You have
            been signed out.
          </p>
          <Button className="mt-5" onClick={() => router.replace("/login")}>
            Back to login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-page">
      <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0">
        <AdminSidebar />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-card-border bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-[10px] text-ink hover:bg-row"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <p className="truncate text-sm text-secondary-text">{adminEmail}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>

        <div className="hidden items-center justify-end gap-3 border-b border-card-border bg-white px-7 py-3 lg:flex">
          <p className="text-sm text-secondary-text">{adminEmail}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>

        <main className="flex-1 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
