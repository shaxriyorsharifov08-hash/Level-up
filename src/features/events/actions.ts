"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { eventRegistrations, events } from "@/db/schema";
import { EVENT_CATEGORIES } from "@/config/site";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import {
  checkbox,
  type FormState,
  invalid,
  localDateTime,
  optionalPositiveInt,
  optionalUrl,
  parseForm,
  requiredText,
} from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { notify } from "@/features/notifications/service";
import { getOrgAccess, getOrgAudienceIds } from "@/features/organizations/queries";
import { cancelUserRegistration, registerUser, RegistrationError, syncWaitlist } from "./registration";

const eventSchema = z
  .object({
    title: requiredText(120, "Title"),
    description: z.string().trim().max(10000, "Too long").default(""),
    category: z.enum(EVENT_CATEGORIES),
    location: requiredText(200, "Location"),
    startsAt: localDateTime("Start"),
    endsAt: localDateTime("End"),
    capacity: optionalPositiveInt("Capacity"),
    coverUrl: optionalUrl,
    status: z.enum(["draft", "published"]),
    registrationOpen: checkbox,
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "End must be after the start" });

async function loadOrgForEvents(user: CurrentUser, orgId: string) {
  const org = await db.query.organizations.findFirst({ where: (o, { eq }) => eq(o.id, orgId) });
  if (!org) return null;
  const access = await getOrgAccess(user, org.id, org.parentId);
  return access.canManage ? org : null;
}

async function loadManagedEvent(user: CurrentUser, eventId: string) {
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return null;
  const org = await loadOrgForEvents(user, event.organizationId);
  return org ? { event, org } : null;
}

async function announceEvent(event: { id: string; title: string; startsAt: Date; organizationId: string }, orgName: string, actorId: string) {
  await notify(
    await getOrgAudienceIds(event.organizationId),
    { title: `New event by ${orgName}: ${event.title}`, body: formatDateTime(event.startsAt), link: `/events/${event.id}` },
    { exclude: actorId },
  );
}

export async function createEvent(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const org = await loadOrgForEvents(user, orgId);
  if (!org) return { error: "You don't have permission to create events here." };

  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const [event] = await db
    .insert(events)
    .values({ ...parsed.data, organizationId: org.id, createdById: user.id })
    .returning();
  if (event.status === "published") await announceEvent(event, org.name, user.id);

  refreshAll();
  redirect(`/workspace/${org.slug}/events/${event.id}`);
}

export async function updateEvent(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadManagedEvent(user, eventId);
  if (!ctx) return { error: "You don't have permission to edit this event." };

  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  // A cancelled event stays cancelled until it's explicitly restored.
  const status = ctx.event.status === "cancelled" ? "cancelled" : parsed.data.status;

  await db.update(events).set({ ...parsed.data, status }).where(eq(events.id, eventId));
  await syncWaitlist(eventId); // capacity may have grown
  if (ctx.event.status === "draft" && status === "published") {
    await announceEvent({ ...ctx.event, ...parsed.data }, ctx.org.name, user.id);
  }

  refreshAll();
  return { ok: true, message: "Event saved." };
}

async function attendeeIds(eventId: string) {
  const rows = await db
    .select({ userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, eventId));
  return rows.map((r) => r.userId);
}

export async function setEventCancelled(eventId: string, cancelled: boolean): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadManagedEvent(user, eventId);
  if (!ctx) return { error: "Not allowed." };

  await db.update(events).set({ status: cancelled ? "cancelled" : "published" }).where(eq(events.id, eventId));
  await notify(
    await attendeeIds(eventId),
    {
      title: cancelled ? `Cancelled: ${ctx.event.title}` : `Back on: ${ctx.event.title}`,
      body: cancelled ? "The organizers have cancelled this event." : "This event is happening after all.",
      link: `/events/${eventId}`,
    },
    { exclude: user.id },
  );
  refreshAll();
  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await loadManagedEvent(user, eventId);
  if (!ctx) return { error: "Not allowed." };
  await db.delete(events).where(eq(events.id, eventId));
  refreshAll();
  redirect(`/workspace/${ctx.org.slug}/events`);
}

export async function registerForEvent(eventId: string): Promise<FormState> {
  const user = await requireUser(`/events/${eventId}`);
  try {
    const status = await registerUser(eventId, user.id);
    refreshAll();
    return {
      ok: true,
      message: status === "registered" ? "You're registered!" : "The event is full, so you're on the waitlist.",
    };
  } catch (error) {
    if (error instanceof RegistrationError) return { error: error.message };
    throw error;
  }
}

export async function cancelRegistration(eventId: string): Promise<FormState> {
  const user = await requireUser(`/events/${eventId}`);
  await cancelUserRegistration(eventId, user.id);
  refreshAll();
  return { ok: true, message: "Registration cancelled." };
}

export async function toggleCheckIn(registrationId: string): Promise<FormState> {
  const user = await requireUser();
  const registration = await db.query.eventRegistrations.findFirst({
    where: eq(eventRegistrations.id, registrationId),
  });
  if (!registration || registration.status !== "registered") return { error: "Only registered attendees can be checked in." };
  const ctx = await loadManagedEvent(user, registration.eventId);
  if (!ctx) return { error: "Not allowed." };

  await db
    .update(eventRegistrations)
    .set({ checkedInAt: registration.checkedInAt ? null : new Date() })
    .where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.status, "registered")));
  refreshAll();
  return { ok: true };
}
