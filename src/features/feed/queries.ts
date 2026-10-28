import "server-only";
import { and, desc, eq, gte, inArray, isNull, count } from "drizzle-orm";
import { db } from "@/db";
import { events, follows, memberships, notifications, organizations, posts, users } from "@/db/schema";

const orgColumns = { id: organizations.id, slug: organizations.slug, name: organizations.name, logoUrl: organizations.logoUrl };

export type FeedItem =
  | {
      kind: "post";
      id: string;
      createdAt: Date;
      content: string;
      author: { id: string; name: string; avatarUrl: string | null } | null;
      organization: { id: string; slug: string; name: string; logoUrl: string | null };
    }
  | {
      kind: "event";
      id: string;
      createdAt: Date;
      event: { id: string; title: string; startsAt: Date; location: string };
      organization: { id: string; slug: string; name: string; logoUrl: string | null };
    };

export async function getOrgPosts(orgId: string, limit = 10) {
  const rows = await db
    .select({ post: posts, author: { id: users.id, name: users.name, avatarUrl: users.avatarUrl }, organization: orgColumns })
    .from(posts)
    .innerJoin(organizations, eq(organizations.id, posts.organizationId))
    .leftJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.organizationId, orgId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return rows.map(
    (r): FeedItem => ({
      kind: "post",
      id: r.post.id,
      createdAt: r.post.createdAt,
      content: r.post.content,
      author: r.author?.id ? r.author : null,
      organization: r.organization,
    }),
  );
}

/** Organizations whose activity the user sees: followed ones and those they're a member of. */
async function followedOrgIds(userId: string) {
  const [followed, member] = await Promise.all([
    db.select({ id: follows.organizationId }).from(follows).where(eq(follows.userId, userId)),
    db
      .select({ id: memberships.organizationId })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "active"))),
  ]);
  return [...new Set([...followed, ...member].map((r) => r.id))];
}

/** Activity feed: posts and newly announced upcoming events from followed organizations. */
export async function getFeed(userId: string, limit = 15, now = new Date()): Promise<FeedItem[]> {
  const orgIds = await followedOrgIds(userId);
  if (orgIds.length === 0) return [];

  const [postRows, eventRows] = await Promise.all([
    db
      .select({ post: posts, author: { id: users.id, name: users.name, avatarUrl: users.avatarUrl }, organization: orgColumns })
      .from(posts)
      .innerJoin(organizations, eq(organizations.id, posts.organizationId))
      .leftJoin(users, eq(users.id, posts.authorId))
      .where(inArray(posts.organizationId, orgIds))
      .orderBy(desc(posts.createdAt))
      .limit(limit),
    db
      .select({ event: events, organization: orgColumns })
      .from(events)
      .innerJoin(organizations, eq(organizations.id, events.organizationId))
      .where(and(inArray(events.organizationId, orgIds), eq(events.status, "published"), gte(events.endsAt, now)))
      .orderBy(desc(events.createdAt))
      .limit(limit),
  ]);

  const items: FeedItem[] = [
    ...postRows.map(
      (r): FeedItem => ({
        kind: "post",
        id: r.post.id,
        createdAt: r.post.createdAt,
        content: r.post.content,
        author: r.author?.id ? r.author : null,
        organization: r.organization,
      }),
    ),
    ...eventRows.map(
      (r): FeedItem => ({
        kind: "event",
        id: r.event.id,
        createdAt: r.event.createdAt,
        event: { id: r.event.id, title: r.event.title, startsAt: r.event.startsAt, location: r.event.location },
        organization: r.organization,
      }),
    ),
  ];
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return n;
}
