import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Bell, BellOff, Clock, LayoutGrid, LogOut, Settings2, ShieldCheck, UserPlus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { SocialLinks } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cover } from "@/components/ui/misc";
import {
  followOrganization,
  joinOrganization,
  leaveOrganization,
  toggleVerified,
  unfollowOrganization,
} from "@/features/organizations/actions";
import {
  getOrganizationBySlug,
  getOrgCounts,
  getOrgMembers,
  getPublicOrganization,
  listOrganizations,
} from "@/features/organizations/queries";
import { EventCard } from "@/features/events/components/event-card";
import { getUserRegistrationMap, listEvents } from "@/features/events/queries";
import { ProjectCard } from "@/features/projects/components/project-card";
import { listOrgProjects } from "@/features/projects/queries";
import { FeedList } from "@/features/feed/components/feed";
import { getOrgPosts } from "@/features/feed/queries";
import { pluralize } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const org = await getOrganizationBySlug((await params).slug);
  return { title: org?.name ?? "Not found", description: org?.tagline ?? undefined };
}

export default async function OrganizationPage({ params }: PageProps<"/clubs/[slug]">) {
  const { slug } = await params;
  const { user, org, access, isFollowing } = await getPublicOrganization(slug);
  const [members, counts, children, events, projects, posts] = await Promise.all([
    getOrgMembers(org.id),
    getOrgCounts([org.id]),
    org.kind === "organization" ? listOrganizations({ parentId: org.id }) : Promise.resolve([]),
    listEvents({ organizationId: org.id, limit: 4 }),
    listOrgProjects(org.id, { includePrivate: false }),
    getOrgPosts(org.id, 5),
  ]);
  const myRegistrations = await getUserRegistrationMap(user?.id, events.map((e) => e.id));
  const { members: memberCount, followers } = counts.get(org.id)!;
  const team = members.filter((m) => m.role !== "member" || m.responsibility);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <Cover src={org.coverUrl} seed={org.id} label={org.name} className="h-36 sm:h-52" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar
              name={org.name}
              src={org.logoUrl}
              seed={org.id}
              size="xl"
              square
              className="-mt-16 ring-4 ring-card sm:-mt-20"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{org.name}</h1>
                {org.verified && (
                  <Badge variant="primary">
                    <BadgeCheck /> Official
                  </Badge>
                )}
              </div>
              {org.tagline && <p className="mt-1 text-muted-foreground">{org.tagline}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <Badge variant={org.kind === "organization" ? "primary" : "default"}>
                  {org.kind === "organization" ? "Organization" : "Club"}
                </Badge>
                <span>{org.category}</span>
                <span>· {pluralize(memberCount, "member")}</span>
                <span>· {pluralize(followers, "follower")}</span>
                {org.parent && (
                  <span>
                    · Part of{" "}
                    <Link href={`/clubs/${org.parent.slug}`} className="font-medium text-primary-text hover:underline">
                      {org.parent.name}
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            {!user ? (
              <Link href={`/login?next=/clubs/${org.slug}`} className={buttonVariants()}>
                <UserPlus /> Sign in to join
              </Link>
            ) : (
              <>
                {access.canView && (
                  <Link href={`/workspace/${org.slug}`} className={buttonVariants()}>
                    <LayoutGrid /> Open workspace
                  </Link>
                )}
                {!access.isMember && !access.isPending && (
                  <ActionButton
                    action={joinOrganization.bind(null, org.id)}
                    variant={access.canView ? "outline" : "primary"}
                  >
                    <UserPlus /> {org.joinPolicy === "open" ? "Join" : "Request to join"}
                  </ActionButton>
                )}
                {access.isPending && (
                  <ActionButton
                    action={leaveOrganization.bind(null, org.id)}
                    variant="outline"
                    confirm="Cancel your join request?"
                  >
                    <Clock /> Request pending · Cancel
                  </ActionButton>
                )}
                {isFollowing ? (
                  <ActionButton action={unfollowOrganization.bind(null, org.id)} variant="outline">
                    <BellOff /> Unfollow
                  </ActionButton>
                ) : (
                  <ActionButton action={followOrganization.bind(null, org.id)} variant="outline">
                    <Bell /> Follow
                  </ActionButton>
                )}
                {access.isMember && (
                  <ActionButton
                    action={leaveOrganization.bind(null, org.id)}
                    variant="ghost"
                    confirm={`Leave ${org.name}?`}
                  >
                    <LogOut /> Leave
                  </ActionButton>
                )}
                {access.canManage && (
                  <Link href={`/workspace/${org.slug}/settings`} className={buttonVariants({ variant: "ghost" })}>
                    <Settings2 /> Edit
                  </Link>
                )}
                {user.role === "admin" && (
                  <ActionButton action={toggleVerified.bind(null, org.id)} variant="ghost">
                    <ShieldCheck /> {org.verified ? "Remove official badge" : "Mark as official"}
                  </ActionButton>
                )}
              </>
            )}
          </div>
        </div>
        <SocialLinks
          className="border-t border-border px-5 py-4 sm:px-6"
          telegramUrl={org.telegramUrl}
          instagramUrl={org.instagramUrl}
          websiteUrl={org.websiteUrl}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {org.description || "This organization hasn't added a description yet."}
              </p>
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming events</h2>
              {access.canManage && (
                <Link href={`/workspace/${org.slug}/events/new`} className="text-sm font-medium text-primary-text hover:underline">
                  New event
                </Link>
              )}
            </div>
            {events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No upcoming events. Follow {org.name} to hear about the next one.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} myStatus={myRegistrations.get(event.id)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Updates</h2>
            <FeedList items={posts} emptyText={`${org.name} hasn't posted any updates yet.`} />
          </section>

          {projects.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Projects</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} href={`/projects/${p.id}`} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <span className="text-sm text-muted-foreground">{memberCount}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {(team.length ? team : members).slice(0, 8).map((m) => (
                <Link key={m.membershipId} href={`/people/${m.user.id}`} className="flex items-center gap-3 rounded-lg hover:opacity-80">
                  <Avatar name={m.user.name} src={m.user.avatarUrl} seed={m.user.id} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.responsibility || (m.role === "member" ? "Member" : m.role === "owner" ? "Owner" : "Admin")}
                    </p>
                  </div>
                </Link>
              ))}
              {members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
            </CardContent>
          </Card>

          {org.kind === "organization" && (
            <Card>
              <CardHeader>
                <CardTitle>Clubs</CardTitle>
                {access.canManage && (
                  <Link href={`/clubs/new?parent=${org.slug}`} className="text-sm font-medium text-primary-text hover:underline">
                    Add club
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {children.length === 0 && <p className="text-sm text-muted-foreground">No clubs yet.</p>}
                {children.map((club) => (
                  <Link key={club.id} href={`/clubs/${club.slug}`} className="flex items-center gap-3 hover:opacity-80">
                    <Avatar name={club.name} src={club.logoUrl} seed={club.id} size="sm" square />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{club.name}</p>
                      <p className="text-xs text-muted-foreground">{pluralize(club.members, "member")}</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
