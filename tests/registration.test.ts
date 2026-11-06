import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, notifications } from "@/db/schema";
import { cancelUserRegistration, registerUser, RegistrationError, syncWaitlist } from "@/features/events/registration";
import { databaseAvailable, fixtures } from "./helpers/db";

const hasDb = await databaseAvailable();
const f = fixtures();

async function createEvent(orgId: string, overrides: Partial<typeof events.$inferInsert> = {}) {
  const [event] = await db
    .insert(events)
    .values({
      organizationId: orgId,
      title: "Hackathon",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      ...overrides,
    })
    .returning();
  return event;
}

async function statusOf(eventId: string, userId: string) {
  const row = await db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)),
  });
  return row?.status;
}

describe.skipIf(!hasDb)("event registration", () => {
  let orgId: string;
  beforeAll(async () => {
    orgId = (await f.org()).id;
  });
  afterAll(() => f.cleanup());

  it("never overbooks when many students register at the same time", async () => {
    const event = await createEvent(orgId, { capacity: 3 });
    const students = await Promise.all(Array.from({ length: 10 }, (_, i) => f.user(`Student ${i}`)));

    const results = await Promise.all(students.map((s) => registerUser(event.id, s.id)));

    expect(results.filter((r) => r === "registered")).toHaveLength(3);
    expect(results.filter((r) => r === "waitlisted")).toHaveLength(7);
  });

  it("promotes the earliest waitlisted student when a seat frees up and notifies them", async () => {
    const event = await createEvent(orgId, { capacity: 1 });
    const [a, b, c] = [await f.user("A"), await f.user("B"), await f.user("C")];
    expect(await registerUser(event.id, a.id)).toBe("registered");
    expect(await registerUser(event.id, b.id)).toBe("waitlisted");
    expect(await registerUser(event.id, c.id)).toBe("waitlisted");

    await cancelUserRegistration(event.id, a.id);

    expect(await statusOf(event.id, a.id)).toBe("cancelled");
    expect(await statusOf(event.id, b.id)).toBe("registered");
    expect(await statusOf(event.id, c.id)).toBe("waitlisted");
    const note = await db.query.notifications.findFirst({ where: eq(notifications.userId, b.id) });
    expect(note?.title).toContain("A spot opened up");
  });

  it("is idempotent and lets cancelled students re-register at the back of the queue", async () => {
    const event = await createEvent(orgId, { capacity: 1 });
    const [a, b] = [await f.user("A"), await f.user("B")];
    await registerUser(event.id, a.id);
    expect(await registerUser(event.id, a.id)).toBe("registered");
    await registerUser(event.id, b.id);
    await cancelUserRegistration(event.id, a.id); // b is promoted
    expect(await registerUser(event.id, a.id)).toBe("waitlisted");
  });

  it("promotes the waitlist when capacity grows", async () => {
    const event = await createEvent(orgId, { capacity: 1 });
    const [a, b, c] = [await f.user("A"), await f.user("B"), await f.user("C")];
    for (const u of [a, b, c]) await registerUser(event.id, u.id);
    await db.update(events).set({ capacity: 3 }).where(eq(events.id, event.id));
    await syncWaitlist(event.id);
    expect(await statusOf(event.id, c.id)).toBe("registered");
  });

  it("rejects registration for drafts, cancelled, closed or past events", async () => {
    const u = await f.user();
    const draft = await createEvent(orgId, { status: "draft" });
    const cancelled = await createEvent(orgId, { status: "cancelled" });
    const closed = await createEvent(orgId, { registrationOpen: false });
    const past = await createEvent(orgId, { startsAt: new Date(Date.now() - 7200000), endsAt: new Date(Date.now() - 3600000) });
    for (const e of [draft, cancelled, closed, past]) {
      await expect(registerUser(e.id, u.id)).rejects.toBeInstanceOf(RegistrationError);
    }
  });
});
