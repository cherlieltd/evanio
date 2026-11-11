"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPostAuthPath } from "@/lib/post-auth-redirect";

export default function AuthContinuePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getPostAuthPath()
      .then((path) => {
        if (!active) return;
        router.replace(path);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to continue");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">
        {error ?? "Finishing sign-in..."}
      </p>
    </div>
  );
}
