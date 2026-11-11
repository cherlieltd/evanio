import Link from "next/link";

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </span>
  );
}

export function ServicesSection() {
  return (
    <section id="services" className="bg-white py-20 sm:py-24">
      <div className="marketing-container">
        <h2 className="heading-display max-w-3xl text-[36px] text-ink sm:text-[48px]">
          Eight AI services. One dashboard.
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-line bg-white p-6 md:col-span-2 md:p-8">
            <p className="font-heading text-2xl font-bold text-ink">Evi 2.0</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-body">
              Chat with your AI marketing assistant for strategy, creatives,
              campaign plans, and on-brand copy — grounded in your business.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Chat with your AI assistant
            </Link>
          </article>

          <article className="rounded-3xl bg-peach p-6 text-peach-fg md:p-8">
            <Tag>IMAGE</Tag>
            <p className="mt-6 font-heading text-2xl font-bold">AI Ad Images</p>
            <p className="mt-3 text-[15px] leading-relaxed opacity-90">
              Generate scroll-stopping stills for Meta and social in minutes.
            </p>
          </article>

          <article className="rounded-3xl bg-lavender p-6 text-lavender-fg md:p-8">
            <Tag>VIDEO</Tag>
            <p className="mt-6 font-heading text-2xl font-bold">AI Video Ads</p>
            <p className="mt-3 text-[15px] leading-relaxed opacity-90">
              Turn offers into short-form video creatives ready to test.
            </p>
          </article>

          <article className="rounded-3xl border border-line bg-white p-6 md:col-span-2 md:p-8">
            <p className="font-heading text-2xl font-bold text-ink">Brand Kit</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-body">
              Lock colors, fonts, tone, and logo rules so every generation stays
              unmistakably yours.
            </p>
            <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
              <span className="size-9 rounded-full bg-brand" />
              <span className="size-9 rounded-full bg-ad-yellow" />
              <span className="size-9 rounded-full bg-[#7C6CFF]" />
              <span className="size-9 rounded-full bg-peach" />
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl bg-sky p-5 text-sky-fg">
            <Tag>COPY</Tag>
            <p className="mt-5 font-heading text-xl font-bold">
              Ad Copy & Campaigns
            </p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              Hooks, headlines, and full campaign outlines.
            </p>
          </article>
          <article className="rounded-3xl border border-line bg-white p-5">
            <Tag>SOCIAL</Tag>
            <p className="mt-5 font-heading text-xl font-bold text-ink">
              Auto Posting
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Schedule and publish without tool-hopping.
            </p>
          </article>
          <article className="rounded-3xl border border-line bg-white p-5">
            <Tag>INBOX</Tag>
            <p className="mt-5 font-heading text-xl font-bold text-ink">
              Social Auto Reply
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              On-brand replies to comments and DMs.
            </p>
          </article>
          <article className="rounded-3xl bg-butter p-5 text-butter-fg">
            <Tag>SITE</Tag>
            <p className="mt-5 font-heading text-xl font-bold">Chat Widget</p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              Put Evi on your website to qualify leads.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
