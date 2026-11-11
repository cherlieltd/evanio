import { homeSteps } from "@/lib/home-content";
import { cn } from "@/lib/utils";

export function StepsSection() {
  return (
    <section id="how" className="bg-page py-20 sm:py-24">
      <div className="marketing-container">
        <h2 className="heading-display text-center text-[36px] text-ink sm:text-[48px]">
          Live in three steps
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {homeSteps.map((step) => (
            <article
              key={step.step}
              className="rounded-3xl border border-line bg-white p-6 sm:p-7"
            >
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
                  step.badgeClass,
                )}
              >
                STEP {step.step}
              </span>
              <h3 className="mt-5 font-heading text-xl font-bold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-body">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
