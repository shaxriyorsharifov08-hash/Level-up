import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.4}>
        <path d="M6 17 12 7l6 10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 13h6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span>{siteConfig.name}</span>
        <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">
          {siteConfig.university.shortName}
        </span>
      </span>
    </Link>
  );
}
