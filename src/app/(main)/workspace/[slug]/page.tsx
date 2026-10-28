import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/misc";
import { getOrgCounts, getOrgMembers, getWorkspace } from "@/features/organizations/queries";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspaceOverviewPage({ params }: PageProps<"/workspace/[slug]">) {
  const { slug } = await params;
  const { org } = await getWorkspace(slug);
  const [counts, members] = await Promise.all([getOrgCounts([org.id]), getOrgMembers(org.id)]);
  const { members: memberCount, followers } = counts.get(org.id)!;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Members" value={memberCount} icon={Users} />
          <StatCard label="Followers" value={followers} icon={UserCheck} />
        </div>
      </div>
      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Who does what</CardTitle>
            <Link href={`/workspace/${org.slug}/members`} className="text-sm font-medium text-primary-text hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.slice(0, 8).map((m) => (
              <div key={m.membershipId} className="flex items-center gap-3">
                <Avatar name={m.user.name} src={m.user.avatarUrl} seed={m.user.id} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.responsibility || m.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
