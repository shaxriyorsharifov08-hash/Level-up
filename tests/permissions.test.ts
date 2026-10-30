import { describe, expect, it } from "vitest";
import { assignableRoles, canModifyMember, resolveOrgAccess } from "@/lib/permissions";

const active = (role: "owner" | "admin" | "member") => ({ role, status: "active" as const });

describe("resolveOrgAccess", () => {
  it("gives visitors no access", () => {
    const access = resolveOrgAccess({});
    expect(access).toMatchObject({ isMember: false, canManage: false, canView: false, role: null });
  });

  it("lets active members view but not manage", () => {
    const access = resolveOrgAccess({ membership: active("member") });
    expect(access).toMatchObject({ isMember: true, canView: true, canManage: false, role: "member" });
  });

  it("treats pending requests as non-members", () => {
    const access = resolveOrgAccess({ membership: { role: "member", status: "pending" } });
    expect(access).toMatchObject({ isMember: false, isPending: true, canView: false });
  });

  it("lets owners and admins manage", () => {
    expect(resolveOrgAccess({ membership: active("owner") })).toMatchObject({ canManage: true, isOwner: true });
    expect(resolveOrgAccess({ membership: active("admin") })).toMatchObject({ canManage: true, isOwner: false });
  });

  it("lets admins of a parent organization manage its clubs", () => {
    const access = resolveOrgAccess({ parentMembership: active("admin") });
    expect(access).toMatchObject({ canManage: true, canView: true, isMember: false, managesFromOutside: true });
  });

  it("does not grant manage rights to plain members of the parent", () => {
    expect(resolveOrgAccess({ parentMembership: active("member") }).canManage).toBe(false);
  });

  it("lets platform admins manage everything", () => {
    expect(resolveOrgAccess({ platformRole: "admin" })).toMatchObject({ canManage: true, managesFromOutside: true });
  });
});

describe("role assignment rules", () => {
  it("owners can assign any role, admins cannot create owners", () => {
    expect(assignableRoles(resolveOrgAccess({ membership: active("owner") }))).toEqual(["owner", "admin", "member"]);
    expect(assignableRoles(resolveOrgAccess({ membership: active("admin") }))).toEqual(["admin", "member"]);
    expect(assignableRoles(resolveOrgAccess({ membership: active("member") }))).toEqual([]);
  });

  it("admins cannot modify owners", () => {
    const admin = resolveOrgAccess({ membership: active("admin") });
    expect(canModifyMember(admin, "owner")).toBe(false);
    expect(canModifyMember(admin, "member")).toBe(true);
    expect(canModifyMember(resolveOrgAccess({ membership: active("owner") }), "owner")).toBe(true);
    expect(canModifyMember(resolveOrgAccess({ membership: active("member") }), "member")).toBe(false);
  });
});
