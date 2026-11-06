"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversationMembers, conversations, messages, organizations, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { type FormState, invalid, parseForm, requiredText } from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { getOrgAccess } from "@/features/organizations/queries";
import { MAX_MESSAGE_LENGTH } from "./constants";
import { directKey, getMembership, toChatMessage, type ChatMessage } from "./queries";
import { createChannel as createOrgChannel } from "./service";

/** Send a message. Returns the stored message so the client can replace its optimistic copy. */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const user = await requireUser();
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "Message is too long." };
  if (!(await getMembership(conversationId, user.id))) return { ok: false, error: "You're not part of this conversation." };

  const now = new Date();
  const [message] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(messages)
      .values({ conversationId, senderId: user.id, body: text, createdAt: now })
      .returning();
    await tx.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId));
    await tx
      .update(conversationMembers)
      .set({ lastReadAt: now })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id)));
    return inserted;
  });

  return {
    ok: true,
    message: toChatMessage({ ...message, sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl } }),
  };
}

/** Open (or create) the 1:1 conversation with another student. */
export async function startDirectConversation(otherUserId: string): Promise<FormState> {
  const user = await requireUser();
  if (otherUserId === user.id) return { error: "You can't message yourself." };
  const other = await db.query.users.findFirst({ where: eq(users.id, otherUserId), columns: { id: true } });
  if (!other) return { error: "User not found." };

  const key = directKey(user.id, other.id);
  let conversation = await db.query.conversations.findFirst({ where: eq(conversations.directKey, key) });
  if (!conversation) {
    conversation = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(conversations)
        .values({ type: "direct", directKey: key, createdById: user.id })
        .onConflictDoNothing({ target: conversations.directKey })
        .returning();
      // Another request may have created it at the same moment.
      const row = created ?? (await tx.query.conversations.findFirst({ where: eq(conversations.directKey, key) }))!;
      await tx
        .insert(conversationMembers)
        .values([
          { conversationId: row.id, userId: user.id },
          { conversationId: row.id, userId: other.id },
        ])
        .onConflictDoNothing();
      return row;
    });
  }
  redirect(`/messages/${conversation.id}`);
}

/** Used by forms that submit the target user id as `userId`. */
export async function startDirectConversationFromForm(formData: FormData) {
  await startDirectConversation(String(formData.get("userId") ?? ""));
}

const groupSchema = z.object({
  name: requiredText(80, "Group name"),
  memberIds: z
    .union([z.uuid(), z.array(z.uuid())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
});

export async function createGroupConversation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(groupSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const memberIds = [...new Set(parsed.data.memberIds.filter((id) => id !== user.id))];
  if (memberIds.length === 0) return { error: "Select at least one person for the group." };
  if (memberIds.length > 100) return { error: "Groups are limited to 100 people." };

  const existing = await db.select({ id: users.id }).from(users).where(inArray(users.id, memberIds));
  const conversation = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(conversations)
      .values({ type: "group", name: parsed.data.name, createdById: user.id })
      .returning();
    await tx
      .insert(conversationMembers)
      .values([user.id, ...existing.map((u) => u.id)].map((userId) => ({ conversationId: created.id, userId })));
    return created;
  });
  refreshAll();
  redirect(`/messages/${conversation.id}`);
}

export async function leaveGroup(conversationId: string): Promise<FormState> {
  const user = await requireUser();
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!conversation || conversation.type !== "group") return { error: "Only group chats can be left." };
  await db
    .delete(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id)));
  refreshAll();
  redirect("/messages");
}

const channelSchema = z.object({
  name: requiredText(40, "Channel name").transform((v) =>
    v
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  ),
});

/** Organizers can add more internal channels (e.g. #design, #pr-team). */
export async function createChannel(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) return { error: "Organization not found." };
  const access = await getOrgAccess(user, org.id, org.parentId);
  if (!access.canManage) return { error: "Only organizers can create channels." };

  const parsed = parseForm(channelSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.name) return { fieldErrors: { name: ["Use letters or numbers"] } };

  const channel = await createOrgChannel(db, org.id, parsed.data.name, user.id);
  refreshAll();
  redirect(`/messages/${channel.id}`);
}
