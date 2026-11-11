import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Evanio workspace with email or Google."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
