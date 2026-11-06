import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventRegistrations, events, memberships, shopItems, shopOrders, tasks, tokenTransactions } from "@/db/schema";
import { cancelUserRegistration, registerUser, RegistrationError } from "@/features/events/registration";
import { parseAwardCsv } from "@/features/rewards/csv";
import {
  awardTokens,
  cancelOrder,
  getBalance,
  markOrderUsed,
  purchaseItem,
  RewardError,
  syncAttendanceReward,
  syncTaskReward,
} from "@/features/rewards/service";
import { databaseAvailable, fixtures } from "./helpers/db";

const hasDb = await databaseAvailable();
const f = fixtures();
afterAll(() => f.cleanup());

async function fundedStudent(tokens: number, name = "Student") {
  const student = await f.user(name);
  const admin = await f.user("Admin");
  if (tokens) await awardTokens([{ userId: student.id, amount: tokens, description: "Starting balance" }], admin.id);
  return student;
}

async function createEvent(orgId: string, values: Partial<typeof events.$inferInsert> = {}) {
  const [event] = await db
    .insert(events)
    .values({
      organizationId: orgId,
      title: "Workshop",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
      ...values,
    })
    .returning();
  return event;
}

describe.skipIf(!hasDb)("shop", () => {
  it("spends tokens, records the order with a code and refuses when the balance is too low", async () => {
    const student = await fundedStudent(80);
    const item = await f.item({ priceTokens: 50 });

    const order = await purchaseItem(student.id, item.id);
    expect(order.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(order.status).toBe("active");
    expect(await getBalance(student.id)).toBe(30);

    await expect(purchaseItem(student.id, item.id)).rejects.toThrow("You need 20 more tokens");
  });

  it("never overspends when the same student buys twice at the same moment", async () => {
    const student = await fundedStudent(100);
    const item = await f.item({ priceTokens: 60 });

    const results = await Promise.allSettled([purchaseItem(student.id, item.id), purchaseItem(student.id, item.id)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await getBalance(student.id)).toBe(40);
  });

  it("respects stock, even under concurrent purchases by different students", async () => {
    const item = await f.item({ priceTokens: 10, stock: 1 });
    const a = await fundedStudent(50, "A");
    const b = await fundedStudent(50, "B");

    const results = await Promise.allSettled([purchaseItem(a.id, item.id), purchaseItem(b.id, item.id)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(RewardError);
    const [after] = await db.select().from(shopItems).where(eq(shopItems.id, item.id));
    expect(after.stock).toBe(0);
  });

  it("refunds and restocks a cancelled order, but not a used one", async () => {
    const student = await fundedStudent(100);
    const admin = await f.user("Admin");
    const item = await f.item({ priceTokens: 30, stock: 5 });

    const first = await purchaseItem(student.id, item.id);
    await cancelOrder(first.id, admin.id);
    expect(await getBalance(student.id)).toBe(100);
    expect((await db.select().from(shopItems).where(eq(shopItems.id, item.id)))[0].stock).toBe(5);
    await expect(cancelOrder(first.id, admin.id)).rejects.toThrow("already cancelled");

    const second = await purchaseItem(student.id, item.id);
    await markOrderUsed(second.id);
    await expect(cancelOrder(second.id, admin.id)).rejects.toThrow("already used");
    await expect(markOrderUsed(second.id)).rejects.toThrow("Only active orders");
  });

  it("hides inactive items from purchase", async () => {
    const student = await fundedStudent(100);
    const item = await f.item({ active: false });
    await expect(purchaseItem(student.id, item.id)).rejects.toThrow("isn't available");
  });
});

describe.skipIf(!hasDb)("earning tokens", () => {
  it("pays the event reward on check-in at an official organization, once, and takes it back", async () => {
    const org = await f.org("Official club", { verified: true });
    const event = await createEvent(org.id, { tokenReward: 15 });
    const student = await f.user();
    await registerUser(event.id, student.id);
    const [reg] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.userId, student.id));

    await db.update(eventRegistrations).set({ checkedInAt: new Date() }).where(eq(eventRegistrations.id, reg.id));
    await syncAttendanceReward(reg.id);
    await syncAttendanceReward(reg.id); // idempotent
    expect(await getBalance(student.id)).toBe(15);

    await db.update(eventRegistrations).set({ checkedInAt: null }).where(eq(eventRegistrations.id, reg.id));
    await syncAttendanceReward(reg.id);
    expect(await getBalance(student.id)).toBe(0);
  });

  it("pays nothing for unofficial organizations or organizers checking themselves in", async () => {
    const unofficial = await f.org("Unofficial", { verified: false });
    const official = await f.org("Official", { verified: true });
    const student = await f.user();
    const organizer = await f.user("Organizer");
    await db.insert(memberships).values({ organizationId: official.id, userId: organizer.id, role: "admin" });

    for (const [org, user] of [
      [unofficial, student],
      [official, organizer],
    ] as const) {
      const event = await createEvent(org.id);
      await registerUser(event.id, user.id);
      const [reg] = await db
        .select()
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, user.id)));
      await db.update(eventRegistrations).set({ checkedInAt: new Date() }).where(eq(eventRegistrations.id, reg.id));
      await syncAttendanceReward(reg.id);
    }
    expect(await getBalance(student.id)).toBe(0);
    expect(await getBalance(organizer.id)).toBe(0);
  });

  it("pays task rewards by priority, only for tasks assigned by someone else, and revokes on reopen", async () => {
    const org = await f.org("Official", { verified: true });
    const lead = await f.user("Lead");
    const member = await f.user("Member");
    const [assigned] = await db
      .insert(tasks)
      .values({ organizationId: org.id, title: "Design poster", priority: "high", assigneeId: member.id, createdById: lead.id, status: "done" })
      .returning();
    const [selfMade] = await db
      .insert(tasks)
      .values({ organizationId: org.id, title: "My own task", priority: "high", assigneeId: member.id, createdById: member.id, status: "done" })
      .returning();

    await syncTaskReward(assigned.id);
    await syncTaskReward(selfMade.id);
    expect(await getBalance(member.id)).toBe(10);

    await db.update(tasks).set({ status: "in_progress" }).where(eq(tasks.id, assigned.id));
    await syncTaskReward(assigned.id);
    expect(await getBalance(member.id)).toBe(0);
  });
});

describe.skipIf(!hasDb)("ticket vouchers", () => {
  it("applies a voucher when registering and gives it back when the registration is cancelled", async () => {
    const org = await f.org();
    const paid = await createEvent(org.id, { ticketPrice: 40 });
    const student = await fundedStudent(100);
    const voucherItem = await f.item({ kind: "ticket_voucher", discountPercent: 50, priceTokens: 40 });
    const voucher = await purchaseItem(student.id, voucherItem.id);

    await registerUser(paid.id, student.id, voucher.id);
    const [reg] = await db.select().from(eventRegistrations).where(eq(eventRegistrations.userId, student.id));
    expect(reg.voucherOrderId).toBe(voucher.id);
    expect((await db.select().from(shopOrders).where(eq(shopOrders.id, voucher.id)))[0].status).toBe("used");

    await cancelUserRegistration(paid.id, student.id);
    const [released] = await db.select().from(shopOrders).where(eq(shopOrders.id, voucher.id));
    expect(released.status).toBe("active");
    expect((await db.select().from(eventRegistrations).where(eq(eventRegistrations.id, reg.id)))[0].voucherOrderId).toBeNull();
  });

  it("refuses vouchers on free events, other students' vouchers and used vouchers", async () => {
    const org = await f.org();
    const free = await createEvent(org.id);
    const paid = await createEvent(org.id, { ticketPrice: 20 });
    const owner = await fundedStudent(100, "Owner");
    const other = await f.user("Other");
    const voucherItem = await f.item({ kind: "ticket_voucher", discountPercent: 25, priceTokens: 20 });
    const voucher = await purchaseItem(owner.id, voucherItem.id);

    await expect(registerUser(free.id, owner.id, voucher.id)).rejects.toBeInstanceOf(RegistrationError);
    await expect(registerUser(paid.id, other.id, voucher.id)).rejects.toThrow("can't be used");
    await registerUser(paid.id, owner.id, voucher.id);
    const second = await createEvent(org.id, { ticketPrice: 20 });
    await expect(registerUser(second.id, owner.id, voucher.id)).rejects.toThrow("can't be used");
  });
});

describe.skipIf(!hasDb)("manual awards", () => {
  it("adds and deducts tokens", async () => {
    const student = await fundedStudent(0);
    const admin = await f.user("Admin");
    await awardTokens(
      [
        { userId: student.id, amount: 50, description: "Dean's list" },
        { userId: student.id, amount: -20, description: "Correction" },
      ],
      admin.id,
    );
    expect(await getBalance(student.id)).toBe(30);
    const rows = await db.select().from(tokenTransactions).where(eq(tokenTransactions.userId, student.id));
    expect(rows.every((r) => r.reason === "award" && r.createdById === admin.id)).toBe(true);
  });
});

describe("award CSV parsing", () => {
  it("reads rows with or without a header, quoted reasons and default reasons", () => {
    const { rows, errors } = parseAwardCsv(
      'email,tokens,reason\nAziza@Uni.edu,50,"Dean\'s list, autumn"\nbob@uni.edu;-5\n\n',
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, email: "aziza@uni.edu", amount: 50, reason: "Dean's list, autumn" },
      { line: 3, email: "bob@uni.edu", amount: -5, reason: "Achievement award" },
    ]);
  });

  it("reads the downloadable template: columns by name, extra columns ignored, blank tokens skipped", () => {
    const { rows, errors, skipped } = parseAwardCsv(
      "name,email,faculty,tokens,reason\r\nAziza,aziza@uni.edu,CS,100,Top grade\r\nBob,bob@uni.edu,CS,,\r\nCem,cem@uni.edu,CS,0,\r\nDan,dan@uni.edu,CS,20,\r\n",
    );
    expect(errors).toEqual([]);
    expect(skipped).toBe(2);
    expect(rows).toEqual([
      { line: 2, email: "aziza@uni.edu", amount: 100, reason: "Top grade" },
      { line: 5, email: "dan@uni.edu", amount: 20, reason: "Achievement award" },
    ]);
  });

  it("reports invalid rows with their line numbers", () => {
    const { rows, errors, skipped } = parseAwardCsv("not-an-email,10\nok@uni.edu,abc\nok@uni.edu,0\nok@uni.edu,99999");
    expect(rows).toEqual([]);
    expect(skipped).toBe(1);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toContain("Line 1");
    expect(errors[1]).toContain("Line 2");
    expect(errors[2]).toContain("at most");
  });

  it("rejects an empty file, a file with no tokens and a header without the needed columns", () => {
    expect(parseAwardCsv("  \n").errors).toEqual(["The file has no rows."]);
    expect(parseAwardCsv("email,tokens\na@uni.edu,\n").errors).toEqual(["No row has tokens filled in."]);
    expect(parseAwardCsv("name,faculty\nAziza,CS\n").errors[0]).toContain('"email" and a "tokens" column');
  });
});
