"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminMe } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function AuthContinuePage() {
  const router = useRouter();
  const [message, setMessage] = useState("Checking admin access…");

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const me = await getAdminMe();
        if (!active) return;
        if (me.profile.role !== "admin") {
          throw new Error("forbidden");
        }
        router.replace("/");
        router.refresh();
      } catch {
        const supabase = createClient();
        await supabase.auth.signOut();
        if (!active) return;
        setMessage("You do not have access. Signing out…");
        router.replace("/login?error=forbidden");
        router.refresh();
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6">
      <p className="text-sm text-secondary-text">{message}</p>
    </main>
  );
}
