import type { Metadata } from "next";
import { CalendarPlus, Download, MapPin, Trash2, Video } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMeeting, deleteMeeting } from "@/features/meetings/actions";
import { MeetingForm } from "@/features/meetings/components/meeting-form";
import { calendarRange, MonthCalendar } from "@/features/meetings/components/month-calendar";
import { getOrgCalendar, getUpcomingMeetings } from "@/features/meetings/queries";
import { getWorkspace } from "@/features/organizations/queries";
import { formatDateRange, parseMonthParam, TIMEZONE } from "@/lib/dates";
import { param } from "@/lib/search-params";
import { safeUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Team calendar" };

export default async function WorkspaceCalendarPage({ params, searchParams }: PageProps<"/workspace/[slug]/calendar">) {
  const { slug } = await params;
  const { user, org, access } = await getWorkspace(slug);
  const { year, month } = parseMonthParam(param((await searchParams).month));
  const { from, to } = calendarRange(year, month);
  const [items, upcoming] = await Promise.all([
    getOrgCalendar(org.id, org.slug, from, to),
    getUpcomingMeetings([org.id], 10),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
      <MonthCalendar year={year} month={month} items={items} basePath={`/workspace/${org.slug}/calendar`} />
      <aside className="space-y-6">
        {access.canView && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarPlus className="size-4" /> Schedule a meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingForm action={createMeeting.bind(null, org.id)} timezone={TIMEZONE} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No meetings scheduled.</p>}
            {upcoming.map((m) => {
              const link = safeUrl(m.meetingUrl);
              return (
                <div key={m.id} id={`meeting-${m.id}`} className="scroll-mt-24 rounded-lg border border-border p-3 target:ring-2 target:ring-ring">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateRange(m.startsAt, m.endsAt)}</p>
                  {m.location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {m.location}
                    </p>
                  )}
                  {m.description && <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{m.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "soft", size: "sm" })}>
                        <Video /> Join call
                      </a>
                    )}
                    <a href={`/api/meetings/${m.id}/ics`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      <Download /> .ics
                    </a>
                    {(access.canManage || m.createdById === user.id) && (
                      <ActionButton
                        action={deleteMeeting.bind(null, m.id)}
                        variant="ghost"
                        size="sm"
                        confirm="Cancel this meeting? Members will be notified."
                      >
                        <Trash2 /> Cancel
                      </ActionButton>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
