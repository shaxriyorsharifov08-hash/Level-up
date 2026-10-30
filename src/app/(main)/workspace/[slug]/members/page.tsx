import type { Metadata } from "next";
import Link from "next/link";
import { Check, UserMinus, X } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { approveRequest, addMember, rejectRequest, removeMember, updateMember } from "@/features/organizations/actions";
import { AddMemberForm, MemberEditForm } from "@/features/organizations/components/member-forms";
import { getOrgMembers, getPendingRequests, getWorkspace } from "@/features/organizations/queries";
import { formatRelative } from "@/lib/dates";
import { assignableRoles, canModifyMember } from "@/lib/permissions";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params }: PageProps<"/workspace/[slug]/members">) {
  const { slug } = await params;
  const { user, org, access } = await getWorkspace(slug);
  const [members, requests] = await Promise.all([
    getOrgMembers(org.id),
    access.canManage ? getPendingRequests(org.id) : Promise.resolve([]),
  ]);
  const roles = assignableRoles(access);

  return (
    <div className="space-y-6">
      {access.canManage && requests.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Join requests</CardTitle>
              <CardDescription>Students waiting for approval.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {requests.map((r) => (
              <div key={r.membershipId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={r.user.name} src={r.user.avatarUrl} seed={r.user.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/people/${r.user.id}`} className="text-sm font-medium hover:underline">
                    {r.user.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {r.user.faculty ?? "Student"} · requested {formatRelative(r.requestedAt)}
                  </p>
                </div>
                <ActionButton action={approveRequest.bind(null, r.membershipId)} size="sm">
                  <Check /> Approve
                </ActionButton>
                <ActionButton action={rejectRequest.bind(null, r.membershipId)} size="sm" variant="ghost">
                  <X /> Decline
                </ActionButton>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {access.canManage && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Add a team member</CardTitle>
              <CardDescription>Add a student who already has an account, with an optional responsibility.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AddMemberForm action={addMember.bind(null, org.id)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Team ({members.length})</CardTitle>
            <CardDescription>Roles control permissions; responsibilities describe who does what.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((m) => {
            const editable = canModifyMember(access, m.role) && m.user.id !== user.id;
            return (
              <div key={m.membershipId} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.user.name} src={m.user.avatarUrl} seed={m.user.id} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/people/${m.user.id}`} className="truncate text-sm font-medium hover:underline">
                        {m.user.name}
                      </Link>
                      {m.role !== "member" && (
                        <Badge variant={m.role === "owner" ? "primary" : "default"} className="capitalize">
                          {m.role}
                        </Badge>
                      )}
                      {m.user.id === user.id && <Badge variant="outline">You</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.responsibility || m.user.faculty || "Member"} · joined {formatRelative(m.joinedAt)}
                    </p>
                  </div>
                </div>
                {editable && (
                  <div className="flex flex-wrap items-center gap-2">
                    <MemberEditForm
                      action={updateMember.bind(null, m.membershipId)}
                      role={m.role}
                      responsibility={m.responsibility}
                      roles={roles}
                    />
                    <ActionButton
                      action={removeMember.bind(null, m.membershipId)}
                      size="sm"
                      variant="ghost"
                      confirm={`Remove ${m.user.name} from ${org.name}?`}
                      aria-label={`Remove ${m.user.name}`}
                    >
                      <UserMinus />
                    </ActionButton>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
