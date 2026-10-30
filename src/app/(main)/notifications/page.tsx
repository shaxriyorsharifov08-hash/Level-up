import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { Bell, CheckCheck } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { markAllNotificationsRead } from "@/features/feed/actions";
import { listNotifications } from "@/features/feed/queries";
import { requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.readAt).length;
  // Opening the page counts as seeing them; they stay highlighted for this visit.
  if (unread > 0) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} new` : "You're all caught up."}
        actions={
          unread > 0 && (
            <ActionButton action={markAllNotificationsRead} variant="ghost" size="sm">
              <CheckCheck /> Mark all as read
            </ActionButton>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Join requests, task assignments, event updates and meetings show up here." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className={cn(!n.readAt && "bg-primary-soft/40")}>
                {n.link?.startsWith("/") ? (
                  <Link href={n.link} className="block px-4 py-3 hover:bg-accent">
                    {body}
                  </Link>
                ) : (
                  <div className="px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
