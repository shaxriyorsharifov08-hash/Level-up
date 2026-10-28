/**
 * Drops every table so `npm run db:reset` can rebuild the database from migrations
 * and fill it with demo data. Refuses to run against production.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to reset a production database.");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL ?? "postgres://levelup:levelup@localhost:5432/levelup", { onnotice: () => {} });
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);
  await sql.end();
  console.log("✔ Database cleared.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
