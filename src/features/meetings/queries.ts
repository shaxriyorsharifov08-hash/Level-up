import "server-only";
import { and, asc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, meetings, memberships, organizations, users } from "@/db/schema";

export type CalendarItem = {
  id: string;
  kind: "event" | "meeting";
  title: string;
  startsAt: Date;
  endsAt: Date;
  href: string;
  subtitle: string;
  /** Events the user registered for are highlighted. */
  highlight?: boolean;
};

const orgName = { id: organizations.id, slug: organizations.slug, name: organizations.name };

/** Meetings of the given organizations overlapping [from, to). */
export async function listMeetings(orgIds: string[], from: Date, to: Date) {
  if (orgIds.length === 0) return [];
  return db
    .select({ meeting: meetings, organization: orgName, createdBy: { id: users.id, name: users.name } })
    .from(meetings)
    .innerJoin(organizations, eq(organizations.id, meetings.organizationId))
    .leftJoin(users, eq(users.id, meetings.createdById))
    .where(and(inArray(meetings.organizationId, orgIds), lt(meetings.startsAt, to), gte(meetings.endsAt, from)))
    .orderBy(asc(meetings.startsAt));
}

export async function getUpcomingMeetings(orgIds: string[], limit = 5, now = new Date()) {
  if (orgIds.length === 0) return [];
  const rows = await db
    .select({ meeting: meetings, organization: orgName })
    .from(meetings)
    .innerJoin(organizations, eq(organizations.id, meetings.organizationId))
    .where(and(inArray(meetings.organizationId, orgIds), gte(meetings.endsAt, now)))
    .orderBy(asc(meetings.startsAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.meeting, organization: r.organization }));
}

export async function getActiveOrgIds(userId: string) {
  const rows = await db
    .select({ id: memberships.organizationId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
  return rows.map((r) => r.id);
}

/** Calendar for one organization: its (non-draft) events and its meetings. */
export async function getOrgCalendar(orgId: string, slug: string, from: Date, to: Date): Promise<CalendarItem[]> {
  const [eventRows, meetingRows] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.organizationId, orgId), ne(events.status, "draft"), lt(events.startsAt, to), gte(events.endsAt, from))),
    listMeetings([orgId], from, to),
  ]);
  return [
    ...eventRows.map((e) => ({
      id: e.id,
      kind: "event" as const,
      title: e.status === "cancelled" ? `Cancelled: ${e.title}` : e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      href: `/workspace/${slug}/events/${e.id}`,
      subtitle: e.location,
    })),
    ...meetingRows.map(({ meeting }) => ({
      id: meeting.id,
      kind: "meeting" as const,
      title: meeting.title,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      href: `/workspace/${slug}/calendar#meeting-${meeting.id}`,
      subtitle: meeting.location || "Online",
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Personal calendar: events the user registered for, published events of their teams,
 * and their teams' meetings.
 */
export async function getPersonalCalendar(userId: string, from: Date, to: Date): Promise<CalendarItem[]> {
  const orgIds = await getActiveOrgIds(userId);
  const inRange = and(lt(events.startsAt, to), gte(events.endsAt, from), eq(events.status, "published"));

  const [registered, teamEvents, meetingRows] = await Promise.all([
    db
      .select({ event: events, organization: orgName })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .innerJoin(organizations, eq(organizations.id, events.organizationId))
      .where(and(eq(eventRegistrations.userId, userId), ne(eventRegistrations.status, "cancelled"), inRange)),
    orgIds.length
      ? db
          .select({ event: events, organization: orgName })
          .from(events)
          .innerJoin(organizations, eq(organizations.id, events.organizationId))
          .where(and(inArray(events.organizationId, orgIds), inRange))
      : Promise.resolve([]),
    listMeetings(orgIds, from, to),
  ]);

  const registeredIds = new Set(registered.map((r) => r.event.id));
  const eventItems = new Map<string, CalendarItem>();
  for (const { event, organization } of [...registered, ...teamEvents]) {
    if (eventItems.has(event.id)) continue;
    eventItems.set(event.id, {
      id: event.id,
      kind: "event",
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      href: `/events/${event.id}`,
      subtitle: `${organization.name} · ${event.location}`,
      highlight: registeredIds.has(event.id),
    });
  }
  const meetingItems: CalendarItem[] = meetingRows.map(({ meeting, organization }) => ({
    id: meeting.id,
    kind: "meeting",
    title: meeting.title,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    href: `/workspace/${organization.slug}/calendar#meeting-${meeting.id}`,
    subtitle: `${organization.name} · ${meeting.location || "Online"}`,
  }));
  return [...eventItems.values(), ...meetingItems].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** A meeting, only if the user is an active member of its organization (used for ICS downloads). */
export async function getMeetingForUser(meetingId: string, userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(meetingId)) return undefined;
  const [row] = await db
    .select({ meeting: meetings, organization: orgName })
    .from(meetings)
    .innerJoin(organizations, eq(organizations.id, meetings.organizationId))
    .innerJoin(
      memberships,
      and(eq(memberships.organizationId, meetings.organizationId), eq(memberships.userId, userId), eq(memberships.status, "active")),
    )
    .where(eq(meetings.id, meetingId))
    .limit(1);
  return row;
}
