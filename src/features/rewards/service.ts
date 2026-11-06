import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db, type DbOrTx, type Transaction } from "@/db";
import {
  eventRegistrations,
  events,
  memberships,
  organizations,
  shopItems,
  shopOrders,
  tasks,
  tokenTransactions,
  users,
} from "@/db/schema";
import { notify } from "@/features/notifications/service";
import { TASK_REWARDS } from "./constants";

/** A rule was broken (not enough tokens, sold out...); the message is safe to show. */
export class RewardError extends Error {}

export async function getBalance(userId: string, dbx: DbOrTx = db) {
  const [row] = await dbx
    .select({ total: sql<number>`coalesce(sum(${tokenTransactions.amount}), 0)`.mapWith(Number) })
    .from(tokenTransactions)
    .where(eq(tokenTransactions.userId, userId));
  return row?.total ?? 0;
}

/** Lock the student's row so concurrent purchases are serialised and can't overspend. */
async function lockWallet(tx: Transaction, userId: string) {
  const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
  if (!user) throw new RewardError("Account not found.");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to avoid misreading

/** Short, unambiguous redemption code like "K7QX-M2PA". */
export function generateOrderCode() {
  const chars = [...randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/* --------------------------------- Shop --------------------------------- */

export async function purchaseItem(userId: string, itemId: string) {
  const order = await db.transaction(async (tx) => {
    await lockWallet(tx, userId);
    const [item] = await tx.select().from(shopItems).where(eq(shopItems.id, itemId)).for("update");
    if (!item || !item.active) throw new RewardError("This item isn't available any more.");
    if (item.stock !== null && item.stock <= 0) throw new RewardError("Sold out.");

    const balance = await getBalance(userId, tx);
    if (balance < item.priceTokens) {
      throw new RewardError(`You need ${item.priceTokens - balance} more tokens for this.`);
    }

    const [created] = await tx
      .insert(shopOrders)
      .values({
        userId,
        itemId: item.id,
        itemName: item.name,
        kind: item.kind,
        priceTokens: item.priceTokens,
        discountPercent: item.discountPercent,
        partnerName: item.partnerName,
        code: generateOrderCode(),
      })
      .returning();
    await tx.insert(tokenTransactions).values({
      userId,
      amount: -item.priceTokens,
      reason: "purchase",
      description: `Bought ${item.name}`,
      refId: created.id,
    });
    if (item.stock !== null) {
      await tx.update(shopItems).set({ stock: item.stock - 1 }).where(eq(shopItems.id, item.id));
    }
    return created;
  });
  return order;
}

/** Cancel an unused order: refund the tokens and put the item back in stock. */
export async function cancelOrder(orderId: string, actorId: string) {
  const order = await db.transaction(async (tx) => {
    const [found] = await tx.select().from(shopOrders).where(eq(shopOrders.id, orderId)).for("update");
    if (!found) throw new RewardError("Order not found.");
    if (found.status === "used") throw new RewardError("This order was already used, so it can't be refunded.");
    if (found.status === "cancelled") throw new RewardError("This order is already cancelled.");

    await tx.update(shopOrders).set({ status: "cancelled" }).where(eq(shopOrders.id, found.id));
    await tx
      .insert(tokenTransactions)
      .values({
        userId: found.userId,
        amount: found.priceTokens,
        reason: "refund",
        description: `Refund: ${found.itemName}`,
        refId: found.id,
        createdById: actorId,
      })
      .onConflictDoNothing();
    await tx
      .update(shopItems)
      .set({ stock: sql`${shopItems.stock} + 1` })
      .where(and(eq(shopItems.id, found.itemId), isNotNull(shopItems.stock)));
    return found;
  });
  await notify([order.userId], {
    title: `Order cancelled: ${order.itemName}`,
    body: `${order.priceTokens} tokens were returned to your balance.`,
    link: "/rewards",
  });
  return order;
}

/** Staff hand out an item or a partner accepts a voucher. */
export async function markOrderUsed(orderId: string) {
  const [order] = await db
    .update(shopOrders)
    .set({ status: "used", usedAt: new Date() })
    .where(and(eq(shopOrders.id, orderId), eq(shopOrders.status, "active")))
    .returning();
  if (!order) throw new RewardError("Only active orders can be marked as used.");
  return order;
}

/* ----------------------------- Manual awards ---------------------------- */

/**
 * Award (or, with a negative amount, deduct) tokens, e.g. for academic results or competitions.
 * All entries are written in one transaction.
 */
export async function awardTokens(entries: { userId: string; amount: number; description: string }[], actorId: string) {
  if (entries.length === 0) return;
  await db.transaction(async (tx) => {
    await tx.insert(tokenTransactions).values(
      entries.map((e) => ({ userId: e.userId, amount: e.amount, reason: "award" as const, description: e.description, createdById: actorId })),
    );
    for (const e of entries) {
      await notify(
        [e.userId],
        {
          title: e.amount > 0 ? `+${e.amount} tokens: ${e.description}` : `${e.amount} tokens: ${e.description}`,
          link: "/rewards",
        },
        { tx },
      );
    }
  });
}

/* -------------------------- Automatic rewards --------------------------- */

async function isOrgManager(dbx: DbOrTx, organizationId: string, userId: string) {
  const row = await dbx.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.userId, userId),
      eq(memberships.status, "active"),
      inArray(memberships.role, ["owner", "admin"]),
    ),
    columns: { id: true },
  });
  return !!row;
}

/**
 * Make the attendance reward match the registration: paid once a student is checked in at an
 * official organization's event, taken back if the check-in is undone. Organizers checking
 * themselves in earn nothing. Safe to call any number of times.
 */
export async function syncAttendanceReward(registrationId: string, dbx: DbOrTx = db) {
  const [row] = await dbx
    .select({
      registration: eventRegistrations,
      event: { id: events.id, title: events.title, tokenReward: events.tokenReward, organizationId: events.organizationId },
      verified: organizations.verified,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(eq(eventRegistrations.id, registrationId))
    .limit(1);
  if (!row) return;

  const { registration, event } = row;
  const eligible =
    registration.status === "registered" &&
    registration.checkedInAt !== null &&
    row.verified &&
    event.tokenReward > 0 &&
    !(await isOrgManager(dbx, event.organizationId, registration.userId));

  if (!eligible) {
    await dbx
      .delete(tokenTransactions)
      .where(and(eq(tokenTransactions.reason, "event_attendance"), eq(tokenTransactions.refId, registrationId)));
    return;
  }

  const inserted = await dbx
    .insert(tokenTransactions)
    .values({
      userId: registration.userId,
      amount: event.tokenReward,
      reason: "event_attendance",
      description: `Attended ${event.title}`,
      refId: registrationId,
    })
    .onConflictDoNothing()
    .returning({ id: tokenTransactions.id });
  if (inserted.length > 0) {
    await notify(
      [registration.userId],
      { title: `+${event.tokenReward} tokens for attending ${event.title}`, link: "/rewards" },
      { tx: dbx },
    );
  }
}

/**
 * Make the task reward match the task: paid to the assignee when a task someone else created
 * is done (official organizations only), taken back if it's reopened. Safe to call repeatedly.
 */
export async function syncTaskReward(taskId: string, dbx: DbOrTx = db) {
  const [row] = await dbx
    .select({ task: tasks, verified: organizations.verified })
    .from(tasks)
    .innerJoin(organizations, eq(organizations.id, tasks.organizationId))
    .where(eq(tasks.id, taskId))
    .limit(1);
  const byTask = and(eq(tokenTransactions.reason, "task_completed"), eq(tokenTransactions.refId, taskId));
  if (!row) return;

  const { task } = row;
  const assigneeId = task.assigneeId;
  if (task.status !== "done" || !assigneeId || assigneeId === task.createdById || !row.verified) {
    await dbx.delete(tokenTransactions).where(byTask);
    return;
  }

  // If the task was reassigned after an earlier payout, move the reward to the new assignee.
  await dbx.delete(tokenTransactions).where(and(byTask, ne(tokenTransactions.userId, assigneeId)));
  const amount = TASK_REWARDS[task.priority];
  const inserted = await dbx
    .insert(tokenTransactions)
    .values({ userId: assigneeId, amount, reason: "task_completed", description: `Completed "${task.title}"`, refId: taskId })
    .onConflictDoNothing()
    .returning({ id: tokenTransactions.id });
  if (inserted.length > 0) {
    await notify([assigneeId], { title: `+${amount} tokens for completing "${task.title}"`, link: "/rewards" }, { tx: dbx });
  }
}
