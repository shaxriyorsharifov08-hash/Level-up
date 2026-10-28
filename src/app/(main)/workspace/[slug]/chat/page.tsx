import type { Metadata } from "next";
import Link from "next/link";
import { Hash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { createChannel } from "@/features/chat/actions";
import { ChannelForm } from "@/features/chat/components/channel-form";
import { listConversations } from "@/features/chat/queries";
import { getWorkspace } from "@/features/organizations/queries";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Team chat" };

export default async function WorkspaceChatPage({ params }: PageProps<"/workspace/[slug]/chat">) {
  const { slug } = await params;
  const { user, org, access } = await getWorkspace(slug);
  const channels = await listConversations(user.id, { organizationId: org.id });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-2 lg:col-span-2">
        {channels.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="No channels for you here"
            description={access.isMember ? "Channels appear here once they're created." : "Team channels are available to members of this organization."}
          />
        ) : (
          channels.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                <Hash className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", c.unread && "font-semibold")}>{c.title.replace(/^# /, "")}</p>
                <p className={cn("truncate text-sm", c.unread ? "text-foreground" : "text-muted-foreground")}>
                  {c.lastMessage ?? "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.lastMessage && <span className="text-xs text-muted-foreground">{formatRelative(c.lastMessageAt)}</span>}
                {c.unread && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
              </div>
            </Link>
          ))
        )}
      </div>
      {access.canManage && (
        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle>New channel</CardTitle>
              <CardDescription>All current and future members are added automatically.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelForm action={createChannel.bind(null, org.id)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
