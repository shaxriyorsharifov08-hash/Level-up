import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";

/** True when the test database is reachable; integration suites are skipped otherwise. */
export async function databaseAvailable() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

/** Creates throwaway users/organizations and removes them (with cascades) afterwards. */
export function fixtures() {
  const userIds: string[] = [];
  const orgIds: string[] = [];
  return {
    async user(name = "Test User") {
      const [u] = await db
        .insert(users)
        .values({ name, email: `${randomUUID()}@test.local`, passwordHash: "x" })
        .returning();
      userIds.push(u.id);
      return u;
    },
    async org(name = "Test Org") {
      const [o] = await db
        .insert(organizations)
        .values({ name, slug: `test-${randomUUID()}` })
        .returning();
      orgIds.push(o.id);
      return o;
    },
    async cleanup() {
      if (orgIds.length) await db.delete(organizations).where(inArray(organizations.id, orgIds));
      if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    },
  };
}
