/**
 * Drops this app's tables and types so `npm run db:reset` can rebuild the database from
 * migrations and fill it with demo data. Only objects defined in src/db/schema.ts are removed,
 * so Supabase's own schemas, extensions and grants are left untouched.
 *
 * Refuses to touch a remote database (e.g. Supabase) unless ALLOW_REMOTE_RESET=yes is set.
 */
import { config } from "dotenv";
import { getTableName, is } from "drizzle-orm";
import { isPgEnum, PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { directDatabaseUrl, isLocalDatabase } from "../src/db/url";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = directDatabaseUrl();
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to reset a production database.");
    process.exit(1);
  }
  if (!isLocalDatabase(url) && process.env.ALLOW_REMOTE_RESET !== "yes") {
    console.error(
      `Refusing to delete all data in the remote database at ${new URL(url).hostname}.\n` +
        "If you really want to, run again with ALLOW_REMOTE_RESET=yes.",
    );
    process.exit(1);
  }

  const values: unknown[] = Object.values(schema);
  const tables = values.filter((v): v is PgTable => is(v, PgTable)).map((t) => `"${getTableName(t)}"`);
  const enums = values.filter(isPgEnum).map((e) => `"${e.enumName}"`);

  const sql = postgres(url, { onnotice: () => {} });
  await sql.unsafe(`
    DROP TABLE IF EXISTS ${tables.join(", ")} CASCADE;
    DROP TYPE IF EXISTS ${enums.join(", ")} CASCADE;
    DROP SCHEMA IF EXISTS drizzle CASCADE;
  `);
  await sql.end();
  console.log(`✔ Dropped ${tables.length} tables and ${enums.length} types.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
