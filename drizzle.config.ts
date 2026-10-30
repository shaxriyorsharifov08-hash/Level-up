import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { DB_SCHEMA } from "./src/db/schema";
import { directDatabaseUrl } from "./src/db/url";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  // Only ever look at and change this app's own schema, never `public` or other apps' schemas.
  schemaFilter: [DB_SCHEMA],
  // Keep the migration history inside the app's schema too, so it can't collide with the
  // history of another Drizzle project using the same database.
  migrations: { schema: DB_SCHEMA, table: "__drizzle_migrations" },
  dbCredentials: {
    // Migrations need a session connection (Supabase: session pooler or direct connection).
    url: directDatabaseUrl(),
  },
});
