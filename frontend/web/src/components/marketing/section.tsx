import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  narrow?: boolean;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  narrow = false,
}: SectionProps) {
  return (
    <section id={id} className={cn("py-20 sm:py-24", className)}>
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          narrow ? "max-w-3xl" : "max-w-6xl",
        )}
      >
        <div className={cn("mb-10 max-w-2xl", narrow && "mx-auto text-center")}>
          {eyebrow ? (
            <p className="mb-3 text-sm font-medium tracking-wide text-brand">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
