import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchForm } from "@/components/filter-bar";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/form";
import { GroupForm } from "@/features/chat/components/group-form";
import { MessageButton } from "@/features/chat/components/message-button";
import { searchPeople } from "@/features/chat/queries";
import { requireUser } from "@/lib/auth";
import { param } from "@/lib/search-params";

export const metadata: Metadata = { title: "New message" };

export default async function NewMessagePage({ searchParams }: PageProps<"/messages/new">) {
  const user = await requireUser("/messages/new");
  const q = param((await searchParams).q);
  const people = await searchPeople(q, user.id);

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <header className="flex h-16 items-center gap-3 border-b border-border px-4">
        <Link href="/messages" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent lg:hidden" aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
        <h2 className="font-semibold">New conversation</h2>
      </header>
      <div className="space-y-5 p-4">
        <SearchForm action="/messages/new" q={q} placeholder="Search students by name or faculty…" />
        <GroupForm />
        <ul className="divide-y divide-border rounded-xl border border-border">
          {people.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No students found.</li>}
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <Checkbox form="new-group" name="memberIds" value={p.id} aria-label={`Add ${p.name} to group`} />
              <Avatar name={p.name} src={p.avatarUrl} seed={p.id} size="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/people/${p.id}`} className="block truncate text-sm font-medium hover:underline">
                  {p.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[p.faculty, p.studyYear ? `Year ${p.studyYear}` : null].filter(Boolean).join(" · ") || "Student"}
                </p>
              </div>
              <MessageButton userId={p.id} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
