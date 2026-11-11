import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with email or Google. We’ll set up your business next."
    >
      <SignupForm />
    </AuthShell>
  );
}
