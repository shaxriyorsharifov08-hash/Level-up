"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath } from "./nav-link";

export type TabItem = { href: string; label: string; exact?: boolean; count?: number };

/** Horizontally scrollable link tabs with an active underline. */
export function TabsNav({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-thin -mx-4 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const active = isActivePath(pathname, tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count ? (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {tab.count}
                </span>
              ) : null}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
