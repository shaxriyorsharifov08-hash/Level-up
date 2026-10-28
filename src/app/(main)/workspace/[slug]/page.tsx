import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ListTodo, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, SectionHeader, StatCard } from "@/components/ui/misc";
import { listEvents } from "@/features/events/queries";
import { createPost } from "@/features/feed/actions";
import { FeedList } from "@/features/feed/components/feed";
import { PostComposer } from "@/features/feed/components/post-composer";
import { getOrgPosts } from "@/features/feed/queries";
import { getUpcomingMeetings } from "@/features/meetings/queries";
import { getOrgCounts, getOrgMembers, getWorkspace } from "@/features/organizations/queries";
import { getTaskStats, listOrgProjects, listTasks } from "@/features/projects/queries";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspaceOverviewPage({ params }: PageProps<"/workspace/[slug]">) {
  const { slug } = await params;
  const { user, org, access } = await getWorkspace(slug);
  const [counts, members, taskStats, events, posts, projects, myTasks, meetings] = await Promise.all([
    getOrgCounts([org.id]),
    getOrgMembers(org.id),
    getTaskStats(org.id),
    listEvents({ organizationId: org.id, limit: 3 }),
    getOrgPosts(org.id, 5),
    listOrgProjects(org.id, { includePrivate: true }),
    listTasks({ organizationId: org.id, assigneeId: user.id, includeDone: false }),
    getUpcomingMeetings([org.id], 4),
  ]);
  const { members: memberCount, followers } = counts.get(org.id)!;
  const openTasks = taskStats.todo + taskStats.in_progress + taskStats.review;
  const base = `/workspace/${org.slug}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Members" value={memberCount} icon={Users} />
          <StatCard label="Followers" value={followers} icon={UserCheck} />
          <StatCard label="Open tasks" value={openTasks} icon={ListTodo} hint={`${taskStats.done} done`} />
          <StatCard label="Upcoming events" value={events.length} icon={CalendarDays} />
        </div>

        <section className="space-y-3">
          <SectionHeader title="Updates" />
          {access.canManage && <PostComposer action={createPost.bind(null, org.id)} orgName={org.name} />}
          <FeedList items={posts} canDelete={access.canManage} emptyText="No updates yet." />
        </section>

        {projects.length > 0 && (
          <section>
            <SectionHeader
              title="Projects"
              action={
                <Link href={`${base}/projects`} className="text-sm font-medium text-primary-text hover:underline">
                  All projects
                </Link>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} href={`${base}/projects/${p.id}`} className="rounded-xl border border-border bg-card p-4 hover:bg-accent">
                  <p className="truncate font-medium">{p.title}</p>
                  <div className="mt-3 mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {p.progress.done}/{p.progress.total} tasks
                    </span>
                    <span>{p.progress.percent}%</span>
                  </div>
                  <Progress value={p.progress.percent} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your tasks here</CardTitle>
            <Link href={`${base}/tasks?filter=mine`} className="text-sm font-medium text-primary-text hover:underline">
              Board
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.length === 0 && <p className="text-sm text-muted-foreground">Nothing assigned to you.</p>}
            {myTasks.slice(0, 5).map((t) => (
              <Link key={t.id} href={`${base}/tasks/${t.id}`} className="block rounded-lg p-2 hover:bg-accent">
                <p className="truncate text-sm font-medium">{t.title}</p>
                {t.dueLabel && (
                  <p className={cn("text-xs text-muted-foreground", t.overdue && "font-medium text-destructive")}>Due {t.dueLabel}</p>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next meetings</CardTitle>
            <Link href={`${base}/calendar`} className="text-sm font-medium text-primary-text hover:underline">
              Calendar
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings scheduled.</p>}
            {meetings.map((m) => (
              <Link key={m.id} href={`${base}/calendar#meeting-${m.id}`} className="block hover:opacity-80">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(m.startsAt)} · {m.location || "Online"}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who does what</CardTitle>
            <Link href={`${base}/members`} className="text-sm font-medium text-primary-text hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.slice(0, 8).map((m) => (
              <div key={m.membershipId} className="flex items-center gap-3">
                <Avatar name={m.user.name} src={m.user.avatarUrl} seed={m.user.id} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground capitalize">{m.responsibility || m.role}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
