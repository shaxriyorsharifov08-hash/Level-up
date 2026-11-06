import Link from "next/link";
import { PenSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConversationList, MessagesFrame } from "@/features/chat/components/messages-frame";
import { listConversations } from "@/features/chat/queries";
import { requireUser } from "@/lib/auth";
import { formatRelative } from "@/lib/dates";

export default async function MessagesLayout({ children }: LayoutProps<"/messages">) {
  const user = await requireUser("/messages");
  const conversations = await listConversations(user.id);

  return (
    <MessagesFrame
      list={
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <h1 className="text-lg font-semibold">Messages</h1>
            <Link href="/messages/new" className={buttonVariants({ size: "sm", variant: "soft" })}>
              <PenSquare /> New
            </Link>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations.map((c) => ({
                id: c.id,
                title: c.title,
                subtitle: c.subtitle,
                avatar: c.avatar,
                lastMessage: c.lastMessage,
                timeLabel: c.lastMessage ? formatRelative(c.lastMessageAt) : "",
                unread: c.unread,
                href: c.href,
              }))}
            />
          </div>
        </div>
      }
    >
      {children}
    </MessagesFrame>
  );
}
