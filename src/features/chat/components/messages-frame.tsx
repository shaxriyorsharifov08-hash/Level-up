"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ConversationListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  avatar: { name: string; url: string | null; seed: string; square: boolean };
  lastMessage: string | null;
  timeLabel: string;
  unread: boolean;
  href: string;
};

/** Two-pane messaging layout; on small screens only one pane is visible at a time. */
export function MessagesFrame({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const inConversation = segment !== null;
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] overflow-hidden border-border bg-card sm:-mx-6 lg:mx-0 lg:my-0 lg:h-[calc(100dvh-4rem)] lg:rounded-2xl lg:border">
      <div className={cn("w-full shrink-0 border-r border-border lg:block lg:w-80", inConversation && "hidden")}>{list}</div>
      <div className={cn("min-w-0 flex-1 flex-col lg:flex", inConversation ? "flex" : "hidden")}>{children}</div>
    </div>
  );
}

export function ConversationList({ conversations }: { conversations: ConversationListItem[] }) {
  const pathname = usePathname();
  if (conversations.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No conversations yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {conversations.map((c) => {
        const active = pathname === c.href;
        return (
          <li key={c.id}>
            <Link
              href={c.href}
              className={cn("flex items-center gap-3 px-4 py-3 transition-colors", active ? "bg-primary-soft" : "hover:bg-accent")}
            >
              <Avatar name={c.avatar.name} src={c.avatar.url} seed={c.avatar.seed} square={c.avatar.square} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{c.timeLabel}</span>
                </div>
                {c.subtitle && <p className="truncate text-[11px] text-muted-foreground">{c.subtitle}</p>}
                <div className="flex items-center gap-2">
                  <p className={cn("truncate text-xs", c.unread ? "text-foreground" : "text-muted-foreground")}>
                    {c.lastMessage ?? "No messages yet"}
                  </p>
                  {c.unread && <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
