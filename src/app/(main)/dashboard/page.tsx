import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, CalendarDays, Flag, ListTodo, MessagesSquare, Plus, Users, Video } from "lucide-react";
import { SocialLinks } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/misc";
import { siteConfig } from "@/config/site";
import { countUnreadConversations } from "@/features/chat/queries";
import { DateBadge, EventCard } from "@/features/events/components/event-card";
import { getMyUpcomingEvents, listEvents } from "@/features/events/queries";
import { FeedList } from "@/features/feed/components/feed";
import { getFeed } from "@/features/feed/queries";
import { getActiveOrgIds, getUpcomingMeetings } from "@/features/meetings/queries";
import { listOrganizations } from "@/features/organizations/queries";
import { listTasks } from "@/features/projects/queries";
import { requireUser } from "@/lib/auth";
import { formatDateRange, formatDateTime, getZonedParts } from "@/lib/dates";
import { cn, safeUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const hour = getZonedParts(new Date()).hour;
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const orgIds = await getActiveOrgIds(user.id);

  const [myEvents, tasks, meetings, feed, unread, upcoming, clubs] = await Promise.all([
    getMyUpcomingEvents(user.id, 5),
    listTasks({ assigneeId: user.id, includeDone: false }),
    getUpcomingMeetings(orgIds, 5),
    getFeed(user.id, 10),
    countUnreadConversations(user.id),
    listEvents({ limit: 12 }),
    listOrganizations({ limit: 30 }),
  ]);

  const myEventIds = new Set(myEvents.map((e) => e.id));
  const suggestedEvents = upcoming.filter((e) => !myEventIds.has(e.id)).slice(0, 3);
  const suggestedClubs = clubs
    .filter((c) => !orgIds.includes(c.id))
    .sort((a, b) => b.members - a.members)
    .slice(0, 4);
  const overdue = tasks.filter((t) => t.overdue).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]} 👋`}
        description="Here's what's happening for you on campus."
        actions={
          <>
            <Link href="/events" className={buttonVariants({ variant: "outline" })}>
              <CalendarDays /> Browse events
            </Link>
            <Link href="/clubs/new" className={buttonVariants()}>
              <Plus /> Start a club
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming events" value={myEvents.length} icon={CalendarCheck2} />
        <StatCard
          label="Open tasks"
          value={tasks.length}
          icon={ListTodo}
          hint={overdue ? <span className="text-destructive">{overdue} overdue</span> : undefined}
        />
        <StatCard label="Unread chats" value={unread} icon={MessagesSquare} />
        <StatCard label="My clubs" value={orgIds.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeader
              title="Your upcoming events"
              action={
                <Link href="/calendar" className="text-sm font-medium text-primary-text hover:underline">
                  Calendar
                </Link>
              }
            />
            {myEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                You haven&apos;t registered for anything yet.{" "}
                <Link href="/events" className="font-medium text-primary-text hover:underline">
                  Find an event
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {myEvents.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 hover:bg-accent"
                  >
                    <DateBadge date={e.startsAt} className="bg-muted shadow-none" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDateRange(e.startsAt, e.endsAt)} · {e.location}
                      </p>
                    </div>
                    {e.status === "cancelled" ? (
                      <Badge variant="danger">Cancelled</Badge>
                    ) : e.myStatus === "waitlisted" ? (
                      <Badge variant="warning">Waitlisted</Badge>
                    ) : (
                      <Badge variant="primary">Going</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="From your clubs" />
            <FeedList items={feed} emptyText="Follow or join clubs to see their updates and new events here." />
          </section>

          {suggestedEvents.length > 0 && (
            <section>
              <SectionHeader
                title="Happening soon"
                action={
                  <Link href="/events" className="text-sm font-medium text-primary-text hover:underline">
                    All events
                  </Link>
                }
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {suggestedEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My tasks</CardTitle>
              <Link href="/tasks" className="text-sm font-medium text-primary-text hover:underline">
                Board
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 && <p className="text-sm text-muted-foreground">Nothing assigned to you. 🎉</p>}
              {tasks.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`/workspace/${t.organization.slug}/tasks/${t.id}`}
                  className="flex items-start gap-2 rounded-lg p-2 hover:bg-accent"
                >
                  <Flag
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      t.priority === "high" ? "text-rose-500" : t.priority === "medium" ? "text-amber-500" : "text-slate-400",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.organization.name}
                      {t.dueLabel && (
                        <span className={cn(t.overdue && "font-medium text-destructive")}> · due {t.dueLabel}</span>
                      )}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings scheduled.</p>}
              {meetings.map((m) => {
                const link = safeUrl(m.meetingUrl);
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <Avatar name={m.organization.name} seed={m.organization.id} size="sm" square />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/workspace/${m.organization.slug}/calendar#meeting-${m.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {m.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(m.startsAt)} · {m.location || "Online"}
                      </p>
                    </div>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-primary-text hover:bg-accent" aria-label="Join call">
                        <Video className="size-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {suggestedClubs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clubs to explore</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedClubs.map((c) => (
                  <Link key={c.id} href={`/clubs/${c.slug}`} className="flex items-center gap-3 hover:opacity-80">
                    <Avatar name={c.name} src={c.logoUrl} seed={c.id} size="sm" square />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.category} · {c.members} members
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Official channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Stay up to date with {siteConfig.university.name}.</p>
              <SocialLinks
                telegramUrl={siteConfig.university.telegramUrl}
                instagramUrl={siteConfig.university.instagramUrl}
                websiteUrl={siteConfig.university.websiteUrl}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
