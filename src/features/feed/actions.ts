"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications, organizations, posts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { type FormState, invalid, parseForm } from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { getOrgAccess } from "@/features/organizations/queries";

const postSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(3000, "Keep updates under 3000 characters"),
});

/** Organizers publish updates that members and followers see in their feed. */
export async function createPost(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) return { error: "Organization not found." };
  const access = await getOrgAccess(user, org.id, org.parentId);
  if (!access.canManage) return { error: "Only organizers can post updates." };

  const parsed = parseForm(postSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  await db.insert(posts).values({ organizationId: org.id, authorId: user.id, content: parsed.data.content });
  refreshAll();
  return { ok: true, message: "Update published." };
}

export async function deletePost(postId: string): Promise<FormState> {
  const user = await requireUser();
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) return { error: "Post not found." };
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, post.organizationId) });
  const access = await getOrgAccess(user, post.organizationId, org?.parentId ?? null);
  if (!access.canManage && post.authorId !== user.id) return { error: "Not allowed." };
  await db.delete(posts).where(eq(posts.id, postId));
  refreshAll();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<FormState> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  refreshAll();
  return { ok: true };
}
