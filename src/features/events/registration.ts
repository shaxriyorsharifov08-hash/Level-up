import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { eventRegistrations, events, type Event } from "@/db/schema";
import { notify } from "@/features/notifications/service";

export class RegistrationError extends Error {}

export type RegistrationResult = "registered" | "waitlisted";

/** Lock the event row so concurrent registrations for the same event are serialised. */
async function lockEvent(tx: Transaction, eventId: string) {
  const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
  return event;
}

async function registeredCount(tx: Transaction, eventId: string) {
  const [{ n }] = await tx
    .select({ n: count() })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));
  return n;
}

export function registrationBlocker(event: Pick<Event, "status" | "registrationOpen" | "endsAt">, now = new Date()) {
  if (event.status === "cancelled") return "This event has been cancelled.";
  if (event.status !== "published") return "This event isn't published yet.";
  if (event.endsAt <= now) return "This event has already ended.";
  if (!event.registrationOpen) return "Registration is closed.";
  return null;
}

/**
 * Register a user for an event. Takes a seat if one is free, otherwise joins the waitlist.
 * Registering again after cancelling re-enters the queue at the back.
 */
export async function registerUser(eventId: string, userId: string): Promise<RegistrationResult> {
  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    if (!event) throw new RegistrationError("Event not found.");
    const blocker = registrationBlocker(event);
    if (blocker) throw new RegistrationError(blocker);

    const existing = await tx.query.eventRegistrations.findFirst({
      where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)),
    });
    if (existing && existing.status !== "cancelled") return existing.status;

    const full = event.capacity !== null && (await registeredCount(tx, eventId)) >= event.capacity;
    const status: RegistrationResult = full ? "waitlisted" : "registered";

    if (existing) {
      await tx
        .update(eventRegistrations)
        .set({ status, checkedInAt: null, updatedAt: new Date() })
        .where(eq(eventRegistrations.id, existing.id));
    } else {
      await tx.insert(eventRegistrations).values({ eventId, userId, status });
    }
    return status;
  });
}

/** Cancel a user's registration and give their seat to the next person on the waitlist. */
export async function cancelUserRegistration(eventId: string, userId: string) {
  return db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    if (!event) throw new RegistrationError("Event not found.");

    const existing = await tx.query.eventRegistrations.findFirst({
      where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)),
    });
    if (!existing || existing.status === "cancelled") return;

    await tx
      .update(eventRegistrations)
      .set({ status: "cancelled", checkedInAt: null })
      .where(eq(eventRegistrations.id, existing.id));

    if (existing.status === "registered") await promoteFromWaitlist(tx, event);
  });
}

/**
 * Move people from the waitlist into free seats (oldest first) and notify them.
 * Call inside a transaction that holds the event lock.
 */
export async function promoteFromWaitlist(tx: Transaction, event: Event) {
  if (event.status !== "published" || event.endsAt <= new Date()) return [];

  let limit: number | undefined;
  if (event.capacity !== null) {
    limit = event.capacity - (await registeredCount(tx, event.id));
    if (limit <= 0) return [];
  }

  const query = tx
    .select({ id: eventRegistrations.id, userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "waitlisted")))
    .orderBy(asc(eventRegistrations.updatedAt), asc(eventRegistrations.createdAt));
  const promoted = limit === undefined ? await query : await query.limit(limit);
  if (promoted.length === 0) return [];

  await tx
    .update(eventRegistrations)
    .set({ status: "registered" })
    .where(inArray(eventRegistrations.id, promoted.map((p) => p.id)));

  await notify(
    promoted.map((p) => p.userId),
    {
      title: `You're in! A spot opened up for ${event.title}`,
      body: "You've been moved from the waitlist to the attendee list.",
      link: `/events/${event.id}`,
    },
    { tx },
  );
  return promoted;
}

/** Re-check the waitlist after an organizer changes capacity or reopens registration. */
export async function syncWaitlist(eventId: string) {
  await db.transaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    if (event) await promoteFromWaitlist(tx, event);
  });
}
