import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, Plus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { getWorkspace, listOrganizations } from "@/features/organizations/queries";
import { pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Clubs" };

export default async function WorkspaceClubsPage({ params }: PageProps<"/workspace/[slug]/clubs">) {
  const { slug } = await params;
  const { org, access } = await getWorkspace(slug);
  if (org.kind !== "organization") notFound();
  const clubs = await listOrganizations({ parentId: org.id });

  return (
    <div>
      <SectionHeader
        title={`Clubs managed by ${org.name}`}
        action={
          access.canManage && (
            <Link href={`/clubs/new?parent=${org.slug}`} className={buttonVariants({ size: "sm" })}>
              <Plus /> New club
            </Link>
          )
        }
      />
      {clubs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clubs yet"
          description="Clubs created under this organization can be managed by its admins."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clubs.map((club) => (
            <Card key={club.id} className="flex items-center gap-3 p-4">
              <Avatar name={club.name} src={club.logoUrl} seed={club.id} size="md" square />
              <div className="min-w-0 flex-1">
                <Link href={`/clubs/${club.slug}`} className="truncate font-medium hover:underline">
                  {club.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {pluralize(club.members, "member")} · {pluralize(club.followers, "follower")}
                </p>
              </div>
              {access.canManage && (
                <Link
                  href={`/workspace/${club.slug}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <LayoutGrid /> Manage
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
