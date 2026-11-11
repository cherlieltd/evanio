import Image from "next/image";
import Link from "next/link";
import { company } from "@/config/company";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const productLinks: FooterLink[] = [
  { label: "Capabilities", href: "/#services" },
  { label: "Evi", href: "/#evi" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Security", href: "/security" },
];

const companyLinks: FooterLink[] = [
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
  { label: "Sign in", href: "/login" },
  { label: "Start free", href: "/signup" },
];

const legalLinks: FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refunds", href: "/refund" },
  { label: "Acceptable Use", href: "/acceptable-use" },
  { label: "Data Deletion", href: "/data-deletion" },
];

const linkClassName =
  "text-[14px] text-[#6B7280] transition-colors duration-200 hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand,#6D4AFF)]";

function FooterLinkList({
  heading,
  links,
}: {
  heading: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2 className="mb-5 font-sans text-[12px] font-semibold tracking-[0.08em] text-[#111827] uppercase">
        {heading}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={`${heading}-${link.label}`}>
            {link.external || link.href.startsWith("mailto:") ? (
              <a href={link.href} className={linkClassName}>
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className={linkClassName}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-[#E8EAF0] bg-[linear-gradient(180deg,#FBFBFD_0%,#F7F8FB_100%)] font-sans"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-16">
        {/* 4 columns in one row on desktop */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-2 md:grid-cols-4 md:gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-14">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand,#6D4AFF)]"
              aria-label="Evanio.ai home"
            >
              <Image
                src="/evi.png"
                alt="Evi"
                width={36}
                height={36}
                className="size-9 rounded-[10px] object-cover shadow-[0_8px_20px_-12px_rgba(109,74,255,0.8)]"
              />
              <span className="text-[17px] font-medium leading-none tracking-tight text-[#111827]">
                Evanio
                <span className="text-[var(--brand,#6D4AFF)]">.Ai</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-[#6B7280]">
              <span className="font-medium text-[#111827]">{company.tagline}</span>{" "}
              {company.description}
            </p>

            <p className="mt-4 text-[14px] text-[#6B7280]">
              Support{" "}
              <a
                href={`mailto:${company.emails.hello}`}
                className="font-medium text-[var(--brand,#6D4AFF)] underline-offset-4 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand,#6D4AFF)]"
              >
                {company.emails.hello}
              </a>
            </p>
          </div>

          <FooterLinkList heading="Product" links={productLinks} />
          <FooterLinkList heading="Company" links={companyLinks} />
          <FooterLinkList heading="Legal" links={legalLinks} />
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[#E8EAF0] pt-6 text-[13px] text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p>
            © {year} {company.legalName}
          </p>
          <p>Payments securely processed by Stripe.</p>
        </div>
      </div>
    </footer>
  );
}
