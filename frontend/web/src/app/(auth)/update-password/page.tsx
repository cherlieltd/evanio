import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Update password",
};

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="You’re signed in via your reset link. Set a new password to continue."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
