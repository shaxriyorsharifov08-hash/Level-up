/**
 * Authorization rules for organizations, kept as pure functions so they are easy to test.
 *
 * - Platform admins can manage everything.
 * - Owners and admins of an organization can manage it.
 * - Owners and admins of a parent organization can manage its clubs.
 * - Active members can use the internal workspace (tasks, calendar, chat).
 */
export type OrgRole = "owner" | "admin" | "member";
type MembershipLike = { role: OrgRole; status: "active" | "pending" } | null | undefined;

export type OrgAccess = {
  role: OrgRole | null;
  isPending: boolean;
  isMember: boolean;
  isOwner: boolean;
  /** Can edit the organization, its events/projects and manage members. */
  canManage: boolean;
  /** Can open the internal workspace. */
  canView: boolean;
  /** Manage rights come from the parent organization or a platform admin, not a membership. */
  managesFromOutside: boolean;
};

const isActiveManager = (m: MembershipLike) =>
  m?.status === "active" && (m.role === "owner" || m.role === "admin");

export function resolveOrgAccess({
  platformRole,
  membership,
  parentMembership,
}: {
  platformRole?: "student" | "admin" | null;
  membership?: MembershipLike;
  parentMembership?: MembershipLike;
}): OrgAccess {
  const isMember = membership?.status === "active";
  const ownManager = isActiveManager(membership);
  const outsideManager = platformRole === "admin" || isActiveManager(parentMembership);
  const canManage = ownManager || outsideManager;
  return {
    role: isMember ? membership!.role : null,
    isPending: membership?.status === "pending",
    isMember,
    isOwner: isMember && membership!.role === "owner",
    canManage,
    canView: isMember || canManage,
    managesFromOutside: !ownManager && outsideManager,
  };
}

/** Which roles the acting user may assign to someone else. */
export function assignableRoles(access: OrgAccess): OrgRole[] {
  if (access.isOwner || (access.canManage && access.managesFromOutside)) return ["owner", "admin", "member"];
  if (access.canManage) return ["admin", "member"];
  return [];
}

/** Whether the acting user may change or remove a member with `targetRole`. */
export function canModifyMember(access: OrgAccess, targetRole: OrgRole) {
  if (!access.canManage) return false;
  if (targetRole === "owner") return access.isOwner || access.managesFromOutside;
  return true;
}
