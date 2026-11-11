"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  async function handleGoogle() {
    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full justify-center"
      onClick={() => {
        void handleGoogle().catch((error: unknown) => {
          console.error(error);
          window.alert(
            error instanceof Error ? error.message : "Google sign-in failed",
          );
        });
      }}
    >
      {label}
    </Button>
  );
}
