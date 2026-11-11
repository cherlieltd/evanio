import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function EvanioLogo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Evanio.ai home"
    >
      <Image
        src="/evi.png"
        alt="Evi"
        width={36}
        height={36}
        className="size-9 rounded-[10px] object-cover shadow-[0_8px_20px_-12px_rgba(109,74,255,0.75)]"
        priority
      />
      {showWordmark ? (
        <span className="font-heading text-[21px] font-bold leading-none tracking-tight text-ink">
          evanio
          <span className="text-brand">.ai</span>
        </span>
      ) : null}
    </Link>
  );
}

export function EviAvatar({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/evi.png"
      alt="Evi"
      width={size}
      height={size}
      className={cn("rounded-[10px] object-cover", className)}
    />
  );
}
