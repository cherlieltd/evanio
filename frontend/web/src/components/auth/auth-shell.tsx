import type { ReactNode } from "react";
import { EvanioLogo } from "@/components/marketing/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 marketing-grid opacity-30 dark:opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,color-mix(in_oklch,var(--brand)_22%,transparent),transparent_70%)]" />

      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-6">
        <EvanioLogo />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className="border border-border bg-background/90 p-6 shadow-[0_24px_80px_-48px_color-mix(in_oklch,var(--ink)_35%,transparent)] backdrop-blur-sm sm:p-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
