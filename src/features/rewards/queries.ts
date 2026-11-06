import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { shopItems, shopOrders, tokenTransactions, users, type OrderStatus } from "@/db/schema";
import { getBalance } from "./service";

export async function listShopItems({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  return db
    .select()
    .from(shopItems)
    .where(includeInactive ? undefined : eq(shopItems.active, true))
    .orderBy(desc(shopItems.active), asc(shopItems.priceTokens));
}

export async function getShopItem(itemId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return undefined;
  return db.query.shopItems.findFirst({ where: eq(shopItems.id, itemId) });
}

/** Everything the student's wallet page shows. */
export async function getWallet(userId: string) {
  const [balance, history, orders] = await Promise.all([
    getBalance(userId),
    db
      .select()
      .from(tokenTransactions)
      .where(eq(tokenTransactions.userId, userId))
      .orderBy(desc(tokenTransactions.createdAt))
      .limit(50),
    db.select().from(shopOrders).where(eq(shopOrders.userId, userId)).orderBy(desc(shopOrders.createdAt)),
  ]);
  const earned = history.filter((t) => t.amount > 0 && t.reason !== "refund").reduce((sum, t) => sum + t.amount, 0);
  return { balance, history, orders, earnedRecently: earned };
}

/** Unused event-ticket vouchers the student can apply when registering. */
export async function getTicketVouchers(userId: string) {
  return db
    .select({ id: shopOrders.id, itemName: shopOrders.itemName, discountPercent: shopOrders.discountPercent, code: shopOrders.code })
    .from(shopOrders)
    .where(and(eq(shopOrders.userId, userId), eq(shopOrders.kind, "ticket_voucher"), eq(shopOrders.status, "active")))
    .orderBy(desc(shopOrders.discountPercent));
}

/** Orders for the admin redemption desk, optionally filtered by code, item, student or status. */
export async function listOrders({ q, status, limit = 100 }: { q?: string; status?: OrderStatus; limit?: number } = {}) {
  const filters: (SQL | undefined)[] = [];
  if (status) filters.push(eq(shopOrders.status, status));
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(
      or(ilike(shopOrders.code, pattern), ilike(shopOrders.itemName, pattern), ilike(users.name, pattern), ilike(users.email, pattern)),
    );
  }
  return db
    .select({
      order: shopOrders,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(shopOrders)
    .innerJoin(users, eq(users.id, shopOrders.userId))
    .where(and(...filters))
    .orderBy(desc(shopOrders.createdAt))
    .limit(limit);
}

export async function listRecentAwards(limit = 30) {
  return db
    .select({
      tx: tokenTransactions,
      user: { id: users.id, name: users.name, email: users.email },
    })
    .from(tokenTransactions)
    .innerJoin(users, eq(users.id, tokenTransactions.userId))
    .where(and(eq(tokenTransactions.reason, "award"), isNotNull(tokenTransactions.createdById)))
    .orderBy(desc(tokenTransactions.createdAt))
    .limit(limit);
}

/** Faculties students have entered on their profiles, for the award template filter. */
export async function listFaculties() {
  const rows = await db
    .selectDistinct({ faculty: users.faculty })
    .from(users)
    .where(and(eq(users.role, "student"), isNotNull(users.faculty)))
    .orderBy(asc(users.faculty));
  return rows.map((r) => r.faculty!).filter(Boolean);
}

/** Students to pre-fill the bulk award template with, optionally for one faculty. */
export async function listStudentsForAwards(faculty?: string) {
  return db
    .select({ name: users.name, email: users.email, faculty: users.faculty, studyYear: users.studyYear })
    .from(users)
    .where(and(eq(users.role, "student"), faculty ? eq(users.faculty, faculty) : undefined))
    .orderBy(asc(users.faculty), asc(users.name));
}
