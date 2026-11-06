import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { follows, memberships, organizations, users } from "@/db/schema";
import { getCurrentUser, requireUser, type CurrentUser } from "@/lib/auth";
import { resolveOrgAccess, type OrgAccess } from "@/lib/permissions";

export const getOrganizationBySlug = cache(async (slug: string) => {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    with: { parent: { columns: { id: true, slug: true, name: true, logoUrl: true } } },
  });
});

export type OrganizationWithParent = NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>;

/** Resolve what `user` may do in `org` (membership, parent membership, platform role). */
export const getOrgAccess = cache(
  async (user: Pick<CurrentUser, "id" | "role"> | null, orgId: string, parentId: string | null): Promise<OrgAccess> => {
    if (!user) return resolveOrgAccess({});
    const ids = parentId ? [orgId, parentId] : [orgId];
    const rows = await db
      .select({ organizationId: memberships.organizationId, role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), inArray(memberships.organizationId, ids)));
    return resolveOrgAccess({
      platformRole: user.role,
      membership: rows.find((r) => r.organizationId === orgId),
      parentMembership: parentId ? rows.find((r) => r.organizationId === parentId) : null,
    });
  },
);

/**
 * Load an organization for a workspace page. Signs the user in if needed and returns 404
 * when the organization doesn't exist or the user isn't a member/manager.
 */
export async function getWorkspace(slug: string, options: { manage?: boolean } = {}) {
  const user = await requireUser(`/workspace/${slug}`);
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const access = await getOrgAccess(user, org.id, org.parentId);
  if (!access.canView || (options.manage && !access.canManage)) notFound();
  return { user, org, access };
}

/** Same as getWorkspace but for public pages: the user is optional. */
export async function getPublicOrganization(slug: string) {
  const [user, org] = await Promise.all([getCurrentUser(), getOrganizationBySlug(slug)]);
  if (!org) notFound();
  const [access, following] = await Promise.all([
    getOrgAccess(user, org.id, org.parentId),
    user
      ? db.query.follows.findFirst({
          where: and(eq(follows.userId, user.id), eq(follows.organizationId, org.id)),
          columns: { userId: true },
        })
      : null,
  ]);
  return { user, org, access, isFollowing: !!following };
}

/** Number of active members and followers per organization id. */
export async function getOrgCounts(orgIds: string[]) {
  const result = new Map<string, { members: number; followers: number }>();
  if (orgIds.length === 0) return result;
  const [memberRows, followerRows] = await Promise.all([
    db
      .select({ id: memberships.organizationId, n: count() })
      .from(memberships)
      .where(and(inArray(memberships.organizationId, orgIds), eq(memberships.status, "active")))
      .groupBy(memberships.organizationId),
    db
      .select({ id: follows.organizationId, n: count() })
      .from(follows)
      .where(inArray(follows.organizationId, orgIds))
      .groupBy(follows.organizationId),
  ]);
  for (const id of orgIds) result.set(id, { members: 0, followers: 0 });
  for (const r of memberRows) result.get(r.id)!.members = r.n;
  for (const r of followerRows) result.get(r.id)!.followers = r.n;
  return result;
}

export async function listOrganizations({
  q,
  kind,
  category,
  parentId,
  limit = 60,
}: {
  q?: string;
  kind?: "organization" | "club";
  category?: string;
  parentId?: string;
  limit?: number;
} = {}) {
  const filters: (SQL | undefined)[] = [];
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(
      or(
        ilike(organizations.name, pattern),
        ilike(organizations.tagline, pattern),
        ilike(organizations.description, pattern),
      ),
    );
  }
  if (kind) filters.push(eq(organizations.kind, kind));
  if (category) filters.push(eq(organizations.category, category));
  if (parentId) filters.push(eq(organizations.parentId, parentId));

  const orgs = await db
    .select()
    .from(organizations)
    .where(and(...filters))
    .orderBy(desc(organizations.verified), asc(organizations.name))
    .limit(limit);

  const counts = await getOrgCounts(orgs.map((o) => o.id));
  return orgs.map((o) => ({ ...o, ...counts.get(o.id)! }));
}

export type OrganizationListItem = Awaited<ReturnType<typeof listOrganizations>>[number];

/** Active members with their profile, owners and admins first. */
export async function getOrgMembers(orgId: string) {
  const rows = await db
    .select({
      membershipId: memberships.id,
      role: memberships.role,
      responsibility: memberships.responsibility,
      joinedAt: memberships.createdAt,
      user: { id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, faculty: users.faculty },
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "active")))
    .orderBy(asc(users.name));
  const rank = { owner: 0, admin: 1, member: 2 } as const;
  return rows.sort((a, b) => rank[a.role] - rank[b.role]);
}

export type OrgMember = Awaited<ReturnType<typeof getOrgMembers>>[number];

export async function getPendingRequests(orgId: string) {
  return db
    .select({
      membershipId: memberships.id,
      requestedAt: memberships.createdAt,
      user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl, faculty: users.faculty },
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "pending")))
    .orderBy(asc(memberships.createdAt));
}

/** Organizations where the user is an active member (shown as workspaces in the sidebar). */
export async function getUserWorkspaces(userId: string) {
  return db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      kind: organizations.kind,
      role: memberships.role,
      responsibility: memberships.responsibility,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
    .orderBy(asc(organizations.name));
}

/** Organizations the user can create clubs under (owner/admin of an organization). */
export async function getManageableParents(user: Pick<CurrentUser, "id" | "role">) {
  if (user.role === "admin") {
    return db
      .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.kind, "organization"))
      .orderBy(asc(organizations.name));
  }
  return db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.status, "active"),
        inArray(memberships.role, ["owner", "admin"]),
        eq(organizations.kind, "organization"),
      ),
    )
    .orderBy(asc(organizations.name));
}

/** User ids of everyone who manages the organization (its owners/admins). */
export async function getOrgManagerIds(orgId: string) {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, orgId),
        eq(memberships.status, "active"),
        inArray(memberships.role, ["owner", "admin"]),
      ),
    );
  return rows.map((r) => r.userId);
}

export async function getActiveMemberIds(orgId: string) {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.organizationId, orgId), eq(memberships.status, "active")));
  return rows.map((r) => r.userId);
}

/** Members + followers: the audience for announcements and new events. */
export async function getOrgAudienceIds(orgId: string) {
  const [members, followers] = await Promise.all([
    getActiveMemberIds(orgId),
    db.select({ userId: follows.userId }).from(follows).where(eq(follows.organizationId, orgId)),
  ]);
  return [...new Set([...members, ...followers.map((f) => f.userId)])];
}
