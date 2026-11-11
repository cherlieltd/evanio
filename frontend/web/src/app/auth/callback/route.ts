import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      let destination = "/dashboard";

      if (session?.access_token) {
        try {
          const env = getPublicEnv();
          const meResponse = await fetch(`${env.NEXT_PUBLIC_API_URL}/me`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          });

          if (meResponse.ok) {
            const me = (await meResponse.json()) as { business: unknown };
            destination = me.business ? "/dashboard" : "/onboarding";
          } else {
            destination = "/onboarding";
          }
        } catch {
          destination = "/onboarding";
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
