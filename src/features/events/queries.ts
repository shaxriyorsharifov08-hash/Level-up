import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, organizations, users, type RegistrationStatus } from "@/db/schema";

export type EventWindow = "upcoming" | "week" | "past";

const orgColumns = {
  id: organizations.id,
  slug: organizations.slug,
  name: organizations.name,
  logoUrl: organizations.logoUrl,
  verified: organizations.verified,
};

/** Registered/waitlisted counts per event id. */
export async function getRegistrationCounts(eventIds: string[]) {
  const result = new Map<string, { registered: number; waitlisted: number; checkedIn: number }>();
  for (const id of eventIds) result.set(id, { registered: 0, waitlisted: 0, checkedIn: 0 });
  if (eventIds.length === 0) return result;

  const rows = await db
    .select({ eventId: eventRegistrations.eventId, status: eventRegistrations.status, n: count() })
    .from(eventRegistrations)
    .where(and(inArray(eventRegistrations.eventId, eventIds), ne(eventRegistrations.status, "cancelled")))
    .groupBy(eventRegistrations.eventId, eventRegistrations.status);
  for (const r of rows) {
    const entry = result.get(r.eventId)!;
    if (r.status === "registered") entry.registered = r.n;
    if (r.status === "waitlisted") entry.waitlisted = r.n;
  }

  const checkedIn = await db
    .select({ eventId: eventRegistrations.eventId, n: count() })
    .from(eventRegistrations)
    .where(
      and(
        inArray(eventRegistrations.eventId, eventIds),
        eq(eventRegistrations.status, "registered"),
        isNotNull(eventRegistrations.checkedInAt),
      ),
    )
    .groupBy(eventRegistrations.eventId);
  for (const r of checkedIn) result.get(r.eventId)!.checkedIn = r.n;
  return result;
}

/** Statuses of the user's (non-cancelled) registrations for the given events. */
export async function getUserRegistrationMap(userId: string | undefined, eventIds: string[]) {
  const map = new Map<string, RegistrationStatus>();
  if (!userId || eventIds.length === 0) return map;
  const rows = await db
    .select({ eventId: eventRegistrations.eventId, status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.userId, userId),
        inArray(eventRegistrations.eventId, eventIds),
        ne(eventRegistrations.status, "cancelled"),
      ),
    );
  for (const r of rows) map.set(r.eventId, r.status);
  return map;
}

/** Published events for the discover page. */
export async function listEvents({
  q,
  category,
  window = "upcoming",
  organizationId,
  limit = 48,
  now = new Date(),
}: {
  q?: string;
  category?: string;
  window?: EventWindow;
  organizationId?: string;
  limit?: number;
  now?: Date;
} = {}) {
  const filters: (SQL | undefined)[] = [eq(events.status, "published")];
  if (window === "past") filters.push(lt(events.endsAt, now));
  else filters.push(gte(events.endsAt, now));
  if (window === "week") filters.push(lt(events.startsAt, new Date(now.getTime() + 7 * 86400000)));
  if (category) filters.push(eq(events.category, category));
  if (organizationId) filters.push(eq(events.organizationId, organizationId));
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(
      or(ilike(events.title, pattern), ilike(events.description, pattern), ilike(events.location, pattern), ilike(organizations.name, pattern)),
    );
  }

  const rows = await db
    .select({ event: events, organization: orgColumns })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(and(...filters))
    .orderBy(window === "past" ? desc(events.startsAt) : asc(events.startsAt))
    .limit(limit);

  const counts = await getRegistrationCounts(rows.map((r) => r.event.id));
  return rows.map((r) => ({ ...r.event, organization: r.organization, ...counts.get(r.event.id)! }));
}

export type EventListItem = Awaited<ReturnType<typeof listEvents>>[number];

/** All events of an organization, drafts included, for its workspace. */
export async function listOrgEvents(organizationId: string) {
  const rows = await db.query.events.findMany({
    where: eq(events.organizationId, organizationId),
    orderBy: desc(events.startsAt),
  });
  const counts = await getRegistrationCounts(rows.map((e) => e.id));
  return rows.map((e) => ({ ...e, ...counts.get(e.id)! }));
}

export const getEvent = cache(async (eventId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return undefined;
  const [row] = await db
    .select({
      event: events,
      organization: { ...orgColumns, parentId: organizations.parentId, telegramUrl: organizations.telegramUrl, instagramUrl: organizations.instagramUrl },
    })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(eq(events.id, eventId))
    .limit(1);
  return row ? { ...row.event, organization: row.organization } : undefined;
});

export async function getAttendees(eventId: string) {
  return db
    .select({
      registrationId: eventRegistrations.id,
      status: eventRegistrations.status,
      checkedInAt: eventRegistrations.checkedInAt,
      registeredAt: eventRegistrations.createdAt,
      updatedAt: eventRegistrations.updatedAt,
      user: { id: users.id, name: users.name, email: users.email, faculty: users.faculty, avatarUrl: users.avatarUrl },
    })
    .from(eventRegistrations)
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .where(and(eq(eventRegistrations.eventId, eventId), ne(eventRegistrations.status, "cancelled")))
    .orderBy(asc(eventRegistrations.status), asc(eventRegistrations.updatedAt));
}

/** A few attendee avatars for the public event page. */
export async function getAttendeePreview(eventId: string, limit = 8) {
  return db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(eventRegistrations)
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")))
    .orderBy(asc(eventRegistrations.createdAt))
    .limit(limit);
}

/** The user's upcoming events (registered or waitlisted). */
export async function getMyUpcomingEvents(userId: string, limit = 10, now = new Date()) {
  const rows = await db
    .select({ event: events, organization: orgColumns, status: eventRegistrations.status })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(
      and(
        eq(eventRegistrations.userId, userId),
        ne(eventRegistrations.status, "cancelled"),
        ne(events.status, "draft"),
        gte(events.endsAt, now),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.event, organization: r.organization, myStatus: r.status }));
}
