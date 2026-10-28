import "server-only";
import { and, asc, count, desc, eq, gt, ilike, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messages, organizations, users } from "@/db/schema";
import { dayKey, formatDate, formatTime } from "@/lib/dates";
import { truncate } from "@/lib/utils";

export const MESSAGE_PAGE_SIZE = 50;

/** Message shape sent to the client: labels are formatted on the server. */
export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  day: string; // YYYY-MM-DD in the university time zone
  dayLabel: string;
  time: string;
  sender: { id: string; name: string; avatarUrl: string | null } | null;
};

export function toChatMessage(row: {
  id: number;
  body: string;
  createdAt: Date;
  sender: { id: string; name: string; avatarUrl: string | null } | null;
}): ChatMessage {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    day: dayKey(row.createdAt),
    dayLabel: formatDate(row.createdAt),
    time: formatTime(row.createdAt),
    sender: row.sender?.id ? row.sender : null,
  };
}

/** The user's membership row in a conversation, or undefined if they're not a participant. */
export async function getMembership(conversationId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return undefined;
  return db.query.conversationMembers.findFirst({
    where: and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)),
  });
}

/**
 * Messages of a conversation, oldest first.
 * `after`: only newer than this id (polling). `before`: a page of older messages.
 */
export async function getMessages(
  conversationId: string,
  { after, before, limit = MESSAGE_PAGE_SIZE }: { after?: number; before?: number; limit?: number } = {},
) {
  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      sender: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .where(
      and(
        eq(messages.conversationId, conversationId),
        after !== undefined ? gt(messages.id, after) : undefined,
        before !== undefined ? lt(messages.id, before) : undefined,
      ),
    )
    // Polling reads forward; initial load and "load earlier" read the latest page backwards.
    .orderBy(after !== undefined ? asc(messages.id) : desc(messages.id))
    .limit(limit);
  const ordered = after !== undefined ? rows : rows.reverse();
  return ordered.map(toChatMessage);
}

export async function markRead(conversationId: string, userId: string) {
  await db
    .update(conversationMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)));
}

/** Number of conversations with messages the user hasn't seen yet (sidebar badge). */
export async function countUnreadConversations(userId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(and(eq(conversationMembers.userId, userId), gt(conversations.lastMessageAt, conversationMembers.lastReadAt)));
  return n;
}

export type ConversationSummary = {
  id: string;
  type: "direct" | "group" | "channel";
  title: string;
  subtitle: string | null;
  avatar: { name: string; url: string | null; seed: string; square: boolean };
  lastMessage: string | null;
  lastMessageAt: Date;
  unread: boolean;
  href: string;
};

/** Everything needed to show conversations in a list, newest activity first. */
export async function listConversations(userId: string, options: { organizationId?: string; conversationId?: string } = {}) {
  const rows = await db
    .select({
      conversation: conversations,
      lastReadAt: conversationMembers.lastReadAt,
      organization: { id: organizations.id, name: organizations.name, slug: organizations.slug, logoUrl: organizations.logoUrl },
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .leftJoin(organizations, eq(organizations.id, conversations.organizationId))
    .where(
      and(
        eq(conversationMembers.userId, userId),
        options.organizationId ? eq(conversations.organizationId, options.organizationId) : undefined,
        options.conversationId ? eq(conversations.id, options.conversationId) : undefined,
      ),
    )
    .orderBy(desc(conversations.lastMessageAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.conversation.id);
  const nonChannelIds = rows.filter((r) => r.conversation.type !== "channel").map((r) => r.conversation.id);

  const [lastMessages, others] = await Promise.all([
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        senderId: messages.senderId,
        senderName: users.name,
      })
      .from(messages)
      .leftJoin(users, eq(users.id, messages.senderId))
      .where(inArray(messages.conversationId, ids))
      .orderBy(messages.conversationId, desc(messages.id)),
    nonChannelIds.length
      ? db
          .select({
            conversationId: conversationMembers.conversationId,
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
          })
          .from(conversationMembers)
          .innerJoin(users, eq(users.id, conversationMembers.userId))
          .where(and(inArray(conversationMembers.conversationId, nonChannelIds), ne(conversationMembers.userId, userId)))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
  ]);

  const lastBy = new Map(lastMessages.map((m) => [m.conversationId, m]));
  const othersBy = new Map<string, typeof others>();
  for (const o of others) othersBy.set(o.conversationId, [...(othersBy.get(o.conversationId) ?? []), o]);

  return rows.map(({ conversation: c, lastReadAt, organization }): ConversationSummary => {
    const last = lastBy.get(c.id);
    const people = othersBy.get(c.id) ?? [];
    let title: string;
    let subtitle: string | null = null;
    let avatar: ConversationSummary["avatar"];
    if (c.type === "channel") {
      title = `# ${c.name ?? "channel"}`;
      subtitle = organization?.name ?? null;
      avatar = { name: organization?.name ?? "#", url: organization?.logoUrl ?? null, seed: organization?.id ?? c.id, square: true };
    } else if (c.type === "direct") {
      const other = people[0];
      title = other?.name ?? "Deleted user";
      avatar = { name: title, url: other?.avatarUrl ?? null, seed: other?.id ?? c.id, square: false };
    } else {
      title = c.name || people.map((p) => p.name.split(" ")[0]).join(", ") || "Group";
      subtitle = `${people.length + 1} people`;
      avatar = { name: title, url: null, seed: c.id, square: true };
    }
    const prefix = last && c.type !== "direct" && last.senderName ? `${last.senderId === userId ? "You" : last.senderName.split(" ")[0]}: ` : last?.senderId === userId ? "You: " : "";
    return {
      id: c.id,
      type: c.type,
      title,
      subtitle,
      avatar,
      lastMessage: last ? truncate(prefix + last.body.replace(/\s+/g, " "), 80) : null,
      lastMessageAt: c.lastMessageAt,
      unread: !!last && c.lastMessageAt > lastReadAt,
      href: `/messages/${c.id}`,
    };
  });
}

/** Conversation details for the chat header. Returns undefined if the user isn't a participant. */
export async function getConversationForUser(conversationId: string, userId: string) {
  const membership = await getMembership(conversationId, userId);
  if (!membership) return undefined;
  const [summary] = await listConversations(userId, { conversationId });
  const members = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, conversationId))
    .orderBy(asc(users.name));
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: { organization: { columns: { id: true, slug: true, name: true } } },
  });
  return conversation && summary ? { ...conversation, summary, members } : undefined;
}

/** Key that identifies the unique direct conversation between two users. */
export function directKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

/** People search for starting conversations (excludes the current user). */
export async function searchPeople(q: string | undefined, excludeUserId: string, limit = 30) {
  const pattern = q ? `%${q.replace(/[%_\\]/g, "\\$&")}%` : null;
  return db
    .select({ id: users.id, name: users.name, faculty: users.faculty, studyYear: users.studyYear, avatarUrl: users.avatarUrl, bio: users.bio })
    .from(users)
    .where(
      and(
        ne(users.id, excludeUserId),
        pattern ? or(ilike(users.name, pattern), ilike(users.faculty, pattern)) : undefined,
      ),
    )
    .orderBy(asc(users.name))
    .limit(limit);
}
