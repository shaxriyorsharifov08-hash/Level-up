import Link from "next/link";
import { CalendarPlus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { deletePost } from "../actions";
import type { FeedItem } from "../queries";

export function FeedList({
  items,
  canDelete = false,
  emptyText = "No updates yet.",
}: {
  items: FeedItem[];
  canDelete?: boolean;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Link href={`/clubs/${item.organization.slug}`} className="shrink-0">
              <Avatar name={item.organization.name} src={item.organization.logoUrl} seed={item.organization.id} size="md" square />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link href={`/clubs/${item.organization.slug}`} className="font-medium hover:underline">
                  {item.organization.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {item.kind === "post" && item.author ? `${item.author.name} · ` : ""}
                  {formatRelative(item.createdAt)}
                </span>
                {item.kind === "post" && canDelete && (
                  <ActionButton
                    action={deletePost.bind(null, item.id)}
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    formClassName="ml-auto"
                    confirm="Delete this update?"
                    aria-label="Delete update"
                  >
                    <Trash2 />
                  </ActionButton>
                )}
              </div>
              {item.kind === "post" ? (
                <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-line">{item.content}</p>
              ) : (
                <Link
                  href={`/events/${item.event.id}`}
                  className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 hover:bg-accent"
                >
                  <CalendarPlus className="size-5 shrink-0 text-primary-text" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">New event</span>
                    <span className="block truncate text-sm font-medium">{item.event.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatDateTime(item.event.startsAt)} · {item.event.location}
                    </span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
