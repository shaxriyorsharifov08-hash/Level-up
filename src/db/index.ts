import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { appDatabaseUrl } from "./url";

// Reuse the connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

const client =
  globalForDb.pgClient ??
  postgres(appDatabaseUrl(), {
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    // Required for transaction-mode poolers (Supabase on port 6543, PgBouncer); harmless otherwise.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the root db or a transaction; lets helpers participate in a caller's transaction. */
export type DbOrTx = Database | Transaction;
