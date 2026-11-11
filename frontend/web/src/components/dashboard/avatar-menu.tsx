"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AvatarMenuProps = {
  initials: string;
  label: string;
};

export function AvatarMenu({ initials, label }: AvatarMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full border border-card-border bg-white font-heading text-sm font-semibold text-ink transition hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {initials}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[12px] border border-card-border bg-white py-1 shadow-lg"
        >
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className="block px-3 py-2.5 text-sm text-nav hover:bg-soft"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <Link
            href="/dashboard/billing"
            role="menuitem"
            className="block px-3 py-2.5 text-sm text-nav hover:bg-soft"
            onClick={() => setOpen(false)}
          >
            Billing
          </Link>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm text-nav hover:bg-soft"
            onClick={() => void signOut()}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
