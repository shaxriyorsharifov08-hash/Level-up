import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { directDatabaseUrl } from "./src/db/url";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Migrations need a session connection (Supabase: session pooler or direct connection).
    url: directDatabaseUrl(),
  },
});
