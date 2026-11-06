import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, shopItems, users } from "@/db/schema";

/** True when the test database is reachable; integration suites are skipped otherwise. */
export async function databaseAvailable() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

/** Creates throwaway users/organizations/shop items and removes them (with cascades) afterwards. */
export function fixtures() {
  const userIds: string[] = [];
  const orgIds: string[] = [];
  const itemIds: string[] = [];
  return {
    async user(name = "Test User") {
      const [u] = await db
        .insert(users)
        .values({ name, email: `${randomUUID()}@test.local`, passwordHash: "x" })
        .returning();
      userIds.push(u.id);
      return u;
    },
    async org(name = "Test Org", values: Partial<typeof organizations.$inferInsert> = {}) {
      const [o] = await db
        .insert(organizations)
        .values({ name, slug: `test-${randomUUID()}`, ...values })
        .returning();
      orgIds.push(o.id);
      return o;
    },
    async item(values: Partial<typeof shopItems.$inferInsert> = {}) {
      const [i] = await db
        .insert(shopItems)
        .values({ name: "Test hoodie", priceTokens: 50, ...values })
        .returning();
      itemIds.push(i.id);
      return i;
    },
    async cleanup() {
      if (orgIds.length) await db.delete(organizations).where(inArray(organizations.id, orgIds));
      // Deleting users also deletes their orders and token history, which frees the items.
      if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
      if (itemIds.length) await db.delete(shopItems).where(inArray(shopItems.id, itemIds));
    },
  };
}
