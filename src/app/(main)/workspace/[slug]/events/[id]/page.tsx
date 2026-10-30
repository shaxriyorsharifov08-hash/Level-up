import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CheckCircle2, Circle, Download, ExternalLink, RotateCcw, Trash2, UserCheck, Users } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, StatCard } from "@/components/ui/misc";
import { deleteEvent, setEventCancelled, toggleCheckIn, updateEvent } from "@/features/events/actions";
import { EventForm } from "@/features/events/components/event-form";
import { getAttendees, getEvent } from "@/features/events/queries";
import { getWorkspace } from "@/features/organizations/queries";
import { formatDateRange, formatRelative, TIMEZONE, toDateTimeLocalValue } from "@/lib/dates";

export const metadata: Metadata = { title: "Manage event" };

export default async function ManageEventPage({ params }: PageProps<"/workspace/[slug]/events/[id]">) {
  const { slug, id } = await params;
  const { org } = await getWorkspace(slug, { manage: true });
  const event = await getEvent(id);
  if (!event || event.organization.id !== org.id) notFound();

  const attendees = await getAttendees(event.id);
  const registered = attendees.filter((a) => a.status === "registered");
  const waitlisted = attendees.filter((a) => a.status === "waitlisted");
  const checkedIn = registered.filter((a) => a.checkedInAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{event.title}</h2>
            {event.status === "draft" && <Badge variant="warning">Draft</Badge>}
            {event.status === "cancelled" && <Badge variant="danger">Cancelled</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateRange(event.startsAt, event.endsAt)} · {event.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${event.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink /> Event page
          </Link>
          <a href={`/api/events/${event.id}/attendees`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download /> Export CSV
          </a>
          {event.status === "cancelled" ? (
            <ActionButton action={setEventCancelled.bind(null, event.id, false)} variant="outline" size="sm">
              <RotateCcw /> Restore
            </ActionButton>
          ) : (
            <ActionButton
              action={setEventCancelled.bind(null, event.id, true)}
              variant="outline"
              size="sm"
              confirm="Cancel this event? Everyone who registered will be notified."
            >
              <Ban /> Cancel event
            </ActionButton>
          )}
          <ActionButton
            action={deleteEvent.bind(null, event.id)}
            variant="ghost"
            size="sm"
            confirm="Delete this event and all registrations permanently?"
          >
            <Trash2 /> Delete
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Registered"
          value={event.capacity ? `${registered.length} / ${event.capacity}` : registered.length}
          icon={Users}
        />
        <StatCard label="Waitlist" value={waitlisted.length} icon={Circle} />
        <StatCard label="Checked in" value={checkedIn} icon={UserCheck} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Attendees</CardTitle>
            <CardDescription>Check people in at the door. Waitlisted students are promoted automatically when seats free up.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {attendees.length === 0 ? (
            <EmptyState icon={Users} title="No registrations yet" className="py-8" />
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="px-5 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Registered</th>
                    <th className="px-5 py-2 text-right font-medium">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendees.map((a) => (
                    <tr key={a.registrationId}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={a.user.name} src={a.user.avatarUrl} seed={a.user.id} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{a.user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{a.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={a.status === "registered" ? "success" : "warning"} className="capitalize">
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatRelative(a.registeredAt)}</td>
                      <td className="px-5 py-2.5 text-right">
                        {a.status === "registered" && (
                          <ActionButton
                            action={toggleCheckIn.bind(null, a.registrationId)}
                            size="sm"
                            variant={a.checkedInAt ? "soft" : "outline"}
                            formClassName="items-end"
                          >
                            {a.checkedInAt ? (
                              <>
                                <CheckCircle2 /> Checked in
                              </>
                            ) : (
                              "Check in"
                            )}
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            action={updateEvent.bind(null, event.id)}
            submitLabel="Save changes"
            timezone={TIMEZONE}
            values={{
              ...event,
              startsAt: toDateTimeLocalValue(event.startsAt),
              endsAt: toDateTimeLocalValue(event.endsAt),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
