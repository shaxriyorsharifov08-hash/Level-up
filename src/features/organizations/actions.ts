"use server";

import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { follows, memberships, organizations, users } from "@/db/schema";
import { ORG_CATEGORIES } from "@/config/site";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { type FormState, invalid, optionalText, optionalUrl, parseForm, requiredText } from "@/lib/forms";
import { assignableRoles, canModifyMember } from "@/lib/permissions";
import { refreshAll } from "@/lib/revalidate";
import { slugify } from "@/lib/utils";
import { notify } from "@/features/notifications/service";
import { addUserToOrgChannels, createDefaultChannel, removeUserFromOrgChannels } from "@/features/chat/service";
import { getOrgAccess, getOrgManagerIds } from "./queries";

/* --------------------------------- Helpers -------------------------------- */

async function loadOrg(orgId: string) {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) throw new Error("Organization not found");
  return org;
}

async function loadManagedOrg(user: CurrentUser, orgId: string) {
  const org = await loadOrg(orgId);
  const access = await getOrgAccess(user, org.id, org.parentId);
  return { org, access };
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "org";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await db.query.organizations.findFirst({
      where: eq(organizations.slug, candidate),
      columns: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Accept "@handle", "t.me/handle" or a full URL and normalise to a full URL. */
const socialUrl = (host: string) =>
  z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => {
      if (!v) return null;
      if (v.startsWith("@")) return `https://${host}/${v.slice(1)}`;
      if (!/^https?:\/\//i.test(v) && v.includes(".")) return `https://${v}`;
      return v;
    })
    .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Enter a link or @username");

const orgFields = {
  name: requiredText(80, "Name"),
  category: z.enum(ORG_CATEGORIES),
  tagline: optionalText(140),
  description: z.string().trim().max(5000, "Too long").default(""),
  joinPolicy: z.enum(["open", "request"]),
  logoUrl: optionalUrl,
  coverUrl: optionalUrl,
  telegramUrl: socialUrl("t.me"),
  instagramUrl: socialUrl("instagram.com"),
  websiteUrl: optionalUrl,
};

/* --------------------------- Create / update / delete --------------------------- */

const createSchema = z.object({
  ...orgFields,
  kind: z.enum(["organization", "club"]),
  parentId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((v) => v || null),
});

export async function createOrganization(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(createSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  // Only clubs can belong to a parent organization, and only its managers can attach them.
  const parentId = data.kind === "club" ? data.parentId : null;
  if (parentId) {
    const { org: parent, access } = await loadManagedOrg(user, parentId);
    if (parent.kind !== "organization" || !access.canManage) {
      return { fieldErrors: { parentId: ["You can only add clubs to organizations you manage"] } };
    }
  }

  const slug = await uniqueSlug(data.name);
  const org = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organizations)
      .values({ ...data, parentId, slug, createdById: user.id })
      .returning();
    await tx.insert(memberships).values({
      organizationId: created.id,
      userId: user.id,
      role: "owner",
      status: "active",
      responsibility: "Founder",
    });
    await createDefaultChannel(tx, created.id, user.id);
    return created;
  });

  refreshAll();
  redirect(`/workspace/${org.slug}`);
}

export async function updateOrganization(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { access } = await loadManagedOrg(user, orgId);
  if (!access.canManage) return { error: "You don't have permission to edit this organization." };

  const parsed = parseForm(z.object(orgFields), formData);
  if (!parsed.success) return invalid(parsed.error);

  await db.update(organizations).set(parsed.data).where(eq(organizations.id, orgId));
  refreshAll();
  return { ok: true, message: "Changes saved." };
}

export async function deleteOrganization(orgId: string): Promise<FormState> {
  const user = await requireUser();
  const { org, access } = await loadManagedOrg(user, orgId);
  if (!access.isOwner && !access.managesFromOutside) {
    return { error: "Only an owner can delete this organization." };
  }
  await db.delete(organizations).where(eq(organizations.id, org.id));
  refreshAll();
  redirect("/clubs");
}

export async function toggleVerified(orgId: string): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Only platform administrators can verify organizations." };
  const org = await loadOrg(orgId);
  await db.update(organizations).set({ verified: !org.verified }).where(eq(organizations.id, orgId));
  refreshAll();
  return { ok: true };
}

/* ------------------------------ Join / follow ------------------------------ */

export async function joinOrganization(orgId: string): Promise<FormState> {
  const user = await requireUser();
  const org = await loadOrg(orgId);

  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, orgId), eq(memberships.userId, user.id)),
  });
  if (existing) return { ok: true };

  const status = org.joinPolicy === "open" ? "active" : "pending";
  await db.insert(memberships).values({ organizationId: orgId, userId: user.id, status }).onConflictDoNothing();

  if (status === "active") {
    await addUserToOrgChannels(db, orgId, user.id);
    // Members automatically follow the organization's updates.
    await db.insert(follows).values({ userId: user.id, organizationId: orgId }).onConflictDoNothing();
  } else {
    await notify(await getOrgManagerIds(orgId), {
      title: `${user.name} wants to join ${org.name}`,
      body: "Review the request in the members tab.",
      link: `/workspace/${org.slug}/members`,
    });
  }

  refreshAll();
  return { ok: true, message: status === "active" ? `Welcome to ${org.name}!` : "Request sent." };
}

async function countOwners(orgId: string, excludingMembershipId?: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, orgId),
        eq(memberships.role, "owner"),
        eq(memberships.status, "active"),
        excludingMembershipId ? ne(memberships.id, excludingMembershipId) : undefined,
      ),
    );
  return n;
}

export async function leaveOrganization(orgId: string): Promise<FormState> {
  const user = await requireUser();
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, orgId), eq(memberships.userId, user.id)),
  });
  if (!membership) return { ok: true };

  if (membership.role === "owner" && membership.status === "active" && (await countOwners(orgId, membership.id)) === 0) {
    return { error: "You are the only owner. Make someone else an owner before leaving." };
  }

  await db.delete(memberships).where(eq(memberships.id, membership.id));
  await removeUserFromOrgChannels(db, orgId, user.id);
  refreshAll();
  return { ok: true };
}

export async function followOrganization(orgId: string): Promise<FormState> {
  const user = await requireUser();
  await db.insert(follows).values({ userId: user.id, organizationId: orgId }).onConflictDoNothing();
  refreshAll();
  return { ok: true };
}

export async function unfollowOrganization(orgId: string): Promise<FormState> {
  const user = await requireUser();
  await db.delete(follows).where(and(eq(follows.userId, user.id), eq(follows.organizationId, orgId)));
  refreshAll();
  return { ok: true };
}

/* ---------------------------- Member management ---------------------------- */

async function loadMembershipForManager(user: CurrentUser, membershipId: string) {
  const membership = await db.query.memberships.findFirst({ where: eq(memberships.id, membershipId) });
  if (!membership) return null;
  const { org, access } = await loadManagedOrg(user, membership.organizationId);
  return { membership, org, access };
}

export async function approveRequest(membershipId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadMembershipForManager(user, membershipId);
  if (!ctx || !ctx.access.canManage) return { error: "Not allowed." };

  await db.update(memberships).set({ status: "active" }).where(eq(memberships.id, membershipId));
  await addUserToOrgChannels(db, ctx.org.id, ctx.membership.userId);
  await db
    .insert(follows)
    .values({ userId: ctx.membership.userId, organizationId: ctx.org.id })
    .onConflictDoNothing();
  await notify([ctx.membership.userId], {
    title: `You're now a member of ${ctx.org.name}`,
    body: "Your join request was approved.",
    link: `/workspace/${ctx.org.slug}`,
  });
  refreshAll();
  return { ok: true };
}

export async function rejectRequest(membershipId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadMembershipForManager(user, membershipId);
  if (!ctx || !ctx.access.canManage || ctx.membership.status !== "pending") return { error: "Not allowed." };

  await db.delete(memberships).where(eq(memberships.id, membershipId));
  await notify([ctx.membership.userId], {
    title: `Your request to join ${ctx.org.name} was declined`,
    link: `/clubs/${ctx.org.slug}`,
  });
  refreshAll();
  return { ok: true };
}

const memberSchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
  responsibility: optionalText(80),
});

export async function updateMember(membershipId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadMembershipForManager(user, membershipId);
  if (!ctx || !canModifyMember(ctx.access, ctx.membership.role)) return { error: "Not allowed." };

  const parsed = parseForm(memberSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const { role, responsibility } = parsed.data;

  if (role !== ctx.membership.role && !assignableRoles(ctx.access).includes(role)) {
    return { error: "You can't assign that role." };
  }
  if (ctx.membership.role === "owner" && role !== "owner" && (await countOwners(ctx.org.id, membershipId)) === 0) {
    return { error: "An organization needs at least one owner." };
  }

  await db.update(memberships).set({ role, responsibility }).where(eq(memberships.id, membershipId));
  if (role !== ctx.membership.role) {
    await notify(
      [ctx.membership.userId],
      { title: `You are now ${role === "member" ? "a member" : `an ${role}`} of ${ctx.org.name}`, link: `/workspace/${ctx.org.slug}` },
      { exclude: user.id },
    );
  }
  refreshAll();
  return { ok: true, message: "Saved." };
}

export async function removeMember(membershipId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadMembershipForManager(user, membershipId);
  if (!ctx || !canModifyMember(ctx.access, ctx.membership.role)) return { error: "Not allowed." };
  if (ctx.membership.role === "owner" && (await countOwners(ctx.org.id, membershipId)) === 0) {
    return { error: "An organization needs at least one owner." };
  }

  await db.delete(memberships).where(eq(memberships.id, membershipId));
  await removeUserFromOrgChannels(db, ctx.org.id, ctx.membership.userId);
  refreshAll();
  return { ok: true };
}

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid e-mail address")),
  role: z.enum(["admin", "member"]),
  responsibility: optionalText(80),
});

/** Add an existing student to the team by e-mail (skips the join request flow). */
export async function addMember(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { org, access } = await loadManagedOrg(user, orgId);
  if (!access.canManage) return { error: "Not allowed." };

  const parsed = parseForm(addMemberSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const { email, role, responsibility } = parsed.data;

  const target = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, name: true } });
  if (!target) return { fieldErrors: { email: ["No student with this e-mail has an account yet"] } };

  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, orgId), eq(memberships.userId, target.id)),
  });
  if (existing?.status === "active") return { fieldErrors: { email: [`${target.name} is already a member`] } };

  if (existing) {
    await db.update(memberships).set({ status: "active", role, responsibility }).where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({ organizationId: orgId, userId: target.id, role, responsibility, status: "active" });
  }
  await addUserToOrgChannels(db, orgId, target.id);
  await db.insert(follows).values({ userId: target.id, organizationId: orgId }).onConflictDoNothing();
  await notify([target.id], {
    title: `You were added to ${org.name}`,
    body: responsibility ? `Responsibility: ${responsibility}` : undefined,
    link: `/workspace/${org.slug}`,
  });
  refreshAll();
  return { ok: true, message: `${target.name} added to the team.` };
}
