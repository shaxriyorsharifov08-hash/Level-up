/**
 * Deletes this app's database schema (`campus`: all tables, types and the migration history)
 * so `npm run db:reset` can rebuild it from migrations and fill it with demo data.
 * Nothing outside that schema is touched, so other apps in the same database are safe.
 *
 * Refuses to touch a remote database (e.g. Supabase) unless ALLOW_REMOTE_RESET=yes is set.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { DB_SCHEMA } from "../src/db/schema";
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

  const sql = postgres(url, { onnotice: () => {} });
  await sql.unsafe(`DROP SCHEMA IF EXISTS "${DB_SCHEMA}" CASCADE`);
  await sql.end();
  console.log(`✔ Dropped schema "${DB_SCHEMA}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
