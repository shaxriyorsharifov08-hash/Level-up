import { describe, expect, it } from "vitest";
import { appDatabaseUrl, directDatabaseUrl, isLocalDatabase, LOCAL_DATABASE_URL, withSsl } from "@/db/url";

const pooler = "postgresql://postgres.abcd:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
const session = "postgresql://postgres.abcd:p%40ss@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

describe("database URLs", () => {
  it("requires TLS for Supabase hosts and keeps the encoded password", () => {
    const url = new URL(withSsl(pooler));
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.password).toBe("p%40ss");
    expect(new URL(withSsl("postgres://u:p@db.abcd.supabase.co:5432/postgres")).searchParams.get("sslmode")).toBe("require");
  });

  it("leaves other hosts and explicit sslmode untouched", () => {
    expect(withSsl(LOCAL_DATABASE_URL)).toBe(LOCAL_DATABASE_URL);
    expect(withSsl(`${pooler}?sslmode=verify-full`)).toBe(`${pooler}?sslmode=verify-full`);
    expect(withSsl("not a url")).toBe("not a url");
  });

  it("uses the pooler for the app and the session connection for migrations", () => {
    const env = { DATABASE_URL: pooler, DIRECT_URL: session } as unknown as NodeJS.ProcessEnv;
    expect(appDatabaseUrl(env)).toContain(":6543/");
    expect(directDatabaseUrl(env)).toContain(":5432/");
    expect(directDatabaseUrl({ DATABASE_URL: pooler } as unknown as NodeJS.ProcessEnv)).toContain(":6543/");
    expect(appDatabaseUrl({} as NodeJS.ProcessEnv)).toBe(LOCAL_DATABASE_URL);
  });

  it("recognises local databases", () => {
    expect(isLocalDatabase(LOCAL_DATABASE_URL)).toBe(true);
    expect(isLocalDatabase("postgresql://postgres:postgres@127.0.0.1:54322/postgres")).toBe(true);
    expect(isLocalDatabase(session)).toBe(false);
  });
});
