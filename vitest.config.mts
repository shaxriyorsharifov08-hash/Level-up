import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the Next.js server bundle; it's a no-op in tests.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
