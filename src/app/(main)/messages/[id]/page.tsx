import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/ui/avatar";
import { leaveGroup, sendMessage } from "@/features/chat/actions";
import { ChatRoom } from "@/features/chat/components/chat-room";
import { getConversationForUser, getMessages, markRead, MESSAGE_PAGE_SIZE } from "@/features/chat/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Chat" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const conversation = await getConversationForUser(id, user.id);
  if (!conversation) notFound();

  const page = await getMessages(id, { limit: MESSAGE_PAGE_SIZE + 1 });
  const hasMore = page.length > MESSAGE_PAGE_SIZE;
  const initialMessages = hasMore ? page.slice(1) : page;
  await markRead(id, user.id);

  const { summary } = conversation;
  const other = conversation.type === "direct" ? conversation.members.find((m) => m.id !== user.id) : undefined;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <Link href="/messages" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={summary.avatar.name} src={summary.avatar.url} seed={summary.avatar.seed} square={summary.avatar.square} size="sm" />
        <div className="min-w-0 flex-1">
          {other ? (
            <Link href={`/people/${other.id}`} className="block truncate font-semibold hover:underline">
              {summary.title}
            </Link>
          ) : (
            <p className="truncate font-semibold">{summary.title}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {conversation.type === "channel" && conversation.organization ? (
              <Link href={`/workspace/${conversation.organization.slug}`} className="hover:underline">
                {conversation.organization.name} · {conversation.members.length} members
              </Link>
            ) : conversation.type === "group" ? (
              conversation.members.map((m) => m.name.split(" ")[0]).join(", ")
            ) : (
              "Direct message"
            )}
          </p>
        </div>
        {conversation.type === "group" && (
          <ActionButton action={leaveGroup.bind(null, id)} variant="ghost" size="sm" confirm="Leave this group?">
            <LogOut /> <span className="hidden sm:inline">Leave</span>
          </ActionButton>
        )}
      </header>
      <ChatRoom
        key={id}
        conversationId={id}
        currentUser={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }}
        initialMessages={initialMessages}
        hasMoreInitially={hasMore}
        send={sendMessage}
      />
    </>
  );
}
