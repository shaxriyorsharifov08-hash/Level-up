import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { conversationMembers, conversations, memberships } from "@/db/schema";

/**
 * Organization channels mirror the organization's active members: these helpers are
 * called whenever someone joins, is approved, is added or leaves.
 */

export async function createChannel(dbx: DbOrTx, orgId: string, name: string, creatorId: string) {
  const [channel] = await dbx
    .insert(conversations)
    .values({ type: "channel", name, organizationId: orgId, createdById: creatorId })
    .returning();
  const members = await dbx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "active")));
  if (members.length > 0) {
    await dbx
      .insert(conversationMembers)
      .values(members.map((m) => ({ conversationId: channel.id, userId: m.userId })))
      .onConflictDoNothing();
  }
  return channel;
}

export function createDefaultChannel(dbx: DbOrTx, orgId: string, creatorId: string) {
  return createChannel(dbx, orgId, "general", creatorId);
}

export async function addUserToOrgChannels(dbx: DbOrTx, orgId: string, userId: string) {
  const channels = await dbx
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.organizationId, orgId), eq(conversations.type, "channel")));
  if (channels.length === 0) return;
  await dbx
    .insert(conversationMembers)
    .values(channels.map((c) => ({ conversationId: c.id, userId })))
    .onConflictDoNothing();
}

export async function removeUserFromOrgChannels(dbx: DbOrTx, orgId: string, userId: string) {
  const channelIds = dbx
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.organizationId, orgId), eq(conversations.type, "channel")));
  await dbx
    .delete(conversationMembers)
    .where(and(eq(conversationMembers.userId, userId), inArray(conversationMembers.conversationId, channelIds)));
}
