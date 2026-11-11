"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { EvanioLogo } from "@/components/marketing/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { homeNav } from "@/lib/home-content";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="marketing-container flex h-[72px] items-center justify-between gap-4">
        <EvanioLogo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {homeNav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-nav transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="px-2 text-[15px] font-medium text-nav transition-colors hover:text-ink"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Start free
          </Link>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="inline-flex size-10 items-center justify-center rounded-full text-ink md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] bg-white p-0">
            <SheetHeader className="border-b border-line px-5 py-4 text-left">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <EvanioLogo />
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
              {homeNav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-chip"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                <Link
                  href="/login"
                  className="rounded-full border border-pill-border px-4 py-2.5 text-center text-sm font-semibold text-ink"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-hover"
                  onClick={() => setOpen(false)}
                >
                  Start free
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
