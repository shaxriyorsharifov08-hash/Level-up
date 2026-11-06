"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string, exact = false) {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  exact,
  badge,
  meta,
  className,
  children,
}: {
  href: string;
  exact?: boolean;
  badge?: number;
  /** Quiet text on the right, e.g. a balance. */
  meta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href, exact);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-primary-soft text-primary-text"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
      {meta && !badge ? <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">{meta}</span> : null}
      {badge ? (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
