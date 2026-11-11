import type { ReactNode } from "react";
import { company } from "@/config/company";

type LegalPageProps = {
  title: string;
  updated?: string;
  children: ReactNode;
};

export function LegalPage({
  title,
  updated = "November 11, 2026",
  children,
}: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="mb-3 text-sm text-muted-foreground">{company.legalName}</p>
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Effective date: {updated}
      </p>
      <div className="prose-legal mt-10 space-y-6 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
