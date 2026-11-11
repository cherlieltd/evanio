import Link from "next/link";

export function CtaSection() {
  return (
    <section className="bg-white pb-20 pt-4 sm:pb-24">
      <div className="marketing-container">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-brand px-8 py-12 sm:flex-row sm:items-center sm:px-12 sm:py-14">
          <h2 className="heading-display max-w-xl text-[32px] text-white sm:text-[44px]">
            Your next ad is one message away.
          </h2>
          <Link
            href="/signup"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-brand transition-colors hover:bg-chip"
          >
            Start creating free
          </Link>
        </div>
      </div>
    </section>
  );
}
