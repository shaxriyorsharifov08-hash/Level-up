import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Settings } from "lucide-react";
import { SocialLinks } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { MessageButton } from "@/features/chat/components/message-button";
import { requireUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const viewer = await requireUser(`/people/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const person = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, name: true, faculty: true, studyYear: true, bio: true, avatarUrl: true, telegram: true, instagram: true, createdAt: true, role: true },
  });
  if (!person) notFound();

  const orgs = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      role: memberships.role,
      responsibility: memberships.responsibility,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, person.id), eq(memberships.status, "active")))
    .orderBy(asc(organizations.name));

  const isMe = viewer.id === person.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
          <Avatar name={person.name} src={person.avatarUrl} seed={person.id} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
              {person.role === "admin" && <Badge variant="primary">Platform admin</Badge>}
            </div>
            <p className="text-muted-foreground">
              {[person.faculty, person.studyYear ? `Year ${person.studyYear}` : null].filter(Boolean).join(" · ") || "Student"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Member since {formatLongDate(person.createdAt)}</p>
            <SocialLinks
              className="mt-3"
              telegramUrl={person.telegram ? `https://t.me/${person.telegram}` : null}
              instagramUrl={person.instagram ? `https://instagram.com/${person.instagram}` : null}
            />
          </div>
          {isMe ? (
            <Link href="/settings" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Settings /> Edit profile
            </Link>
          ) : (
            <MessageButton userId={person.id} variant="primary" />
          )}
        </CardContent>
      </Card>

      {person.bio && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{person.bio}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clubs & organizations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orgs.length === 0 && <p className="text-sm text-muted-foreground">Not a member of any club yet.</p>}
          {orgs.map((o) => (
            <Link key={o.id} href={`/clubs/${o.slug}`} className="flex items-center gap-3 hover:opacity-80">
              <Avatar name={o.name} src={o.logoUrl} seed={o.id} size="sm" square />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{o.name}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">{o.responsibility || o.role}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
