/**
 * Database connection strings.
 *
 * - `DATABASE_URL` is used by the running app. On Supabase, use the **transaction pooler**
 *   (port 6543): it works from serverless hosts like Vercel and supports many short connections.
 * - `DIRECT_URL` is used by migrations and scripts, which need a regular session. On Supabase,
 *   use the **session pooler** (port 5432 on the pooler host). Falls back to `DATABASE_URL`.
 *
 * Kept free of `server-only` so drizzle.config.ts and the scripts can import it too.
 */

export const LOCAL_DATABASE_URL = "postgres://levelup:levelup@localhost:5432/levelup";

const REQUIRES_TLS = /\.supabase\.(co|com)$/i;

/** Hosted Supabase databases should always be reached over TLS; add `sslmode=require` if missing. */
export function withSsl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("sslmode") || parsed.searchParams.has("ssl")) return url;
    if (!REQUIRES_TLS.test(parsed.hostname)) return url;
    parsed.searchParams.set("sslmode", "require");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function appDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return withSsl(env.DATABASE_URL || LOCAL_DATABASE_URL);
}

export function directDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return withSsl(env.DIRECT_URL || env.DATABASE_URL || LOCAL_DATABASE_URL);
}

export function isLocalDatabase(url: string) {
  try {
    const host = new URL(url).hostname;
    return ["localhost", "127.0.0.1", "[::1]", "::1", "db"].includes(host);
  } catch {
    return false;
  }
}
