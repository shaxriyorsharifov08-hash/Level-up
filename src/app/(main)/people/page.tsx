import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { SearchForm } from "@/components/filter-bar";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { MessageButton } from "@/features/chat/components/message-button";
import { searchPeople } from "@/features/chat/queries";
import { requireUser } from "@/lib/auth";
import { param } from "@/lib/search-params";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const user = await requireUser("/people");
  const q = param((await searchParams).q);
  const people = await searchPeople(q, user.id, 60);

  return (
    <div className="space-y-6">
      <PageHeader title="People" description="Find classmates, teammates and organizers, and start a conversation." />
      <SearchForm action="/people" q={q} placeholder="Search by name or faculty…" />
      {people.length === 0 ? (
        <EmptyState icon={UsersRound} title="No students found" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-4">
              <Link href={`/people/${p.id}`} className="flex items-center gap-3 hover:opacity-80">
                <Avatar name={p.name} src={p.avatarUrl} seed={p.id} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.faculty, p.studyYear ? `Year ${p.studyYear}` : null].filter(Boolean).join(" · ") || "Student"}
                  </p>
                </div>
              </Link>
              {p.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
              <div className="mt-auto">
                <MessageButton userId={p.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
