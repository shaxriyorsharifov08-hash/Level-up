import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        <MessagesSquare className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium">Your conversations</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Chat one-on-one with other students, start a group, or talk with your team in its channels.
      </p>
      <Link href="/messages/new" className={buttonVariants({ className: "mt-4" })}>
        Start a conversation
      </Link>
    </div>
  );
}
