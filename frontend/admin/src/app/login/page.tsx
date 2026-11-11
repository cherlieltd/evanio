"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "forbidden"
      ? "You do not have access. You have been signed out."
      : searchParams.get("error") === "auth_callback"
        ? "Sign-in failed. Try again."
        : null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/auth/continue");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full bg-ink text-white hover:bg-ink/90"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/evi.png"
            alt="Evi"
            width={40}
            height={40}
            className="size-10 rounded-[10px] object-cover"
            priority
          />
          <div>
            <h1 className="font-heading text-xl font-semibold text-ink">
              Evanio Admin
            </h1>
            <p className="text-xs text-secondary-text">admin.evanio.ai</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-secondary-text">
          Sign in with an admin account.
        </p>
        <div className="mt-6">
          <Suspense
            fallback={<p className="text-sm text-secondary-text">Loading…</p>}
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
