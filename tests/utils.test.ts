import { describe, expect, it } from "vitest";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkbox, optionalPositiveInt, optionalUrl, parseForm } from "@/lib/forms";
import { initials, safeUrl, slugify } from "@/lib/utils";

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});

describe("utils", () => {
  it("slugifies names", () => {
    expect(slugify("Coding Club!")).toBe("coding-club");
    expect(slugify("  Café   Société ")).toBe("cafe-societe");
  });

  it("builds initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Plato")).toBe("P");
  });

  it("only allows http(s) URLs", () => {
    expect(safeUrl("https://t.me/x")).toBe("https://t.me/x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
  });
});

describe("form parsing", () => {
  const schema = z.object({ link: optionalUrl, agree: checkbox, seats: optionalPositiveInt(), ids: z.array(z.string()) });

  function form(entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  it("normalises empty values and collects repeated keys", () => {
    const result = parseForm(schema, form([["link", ""], ["seats", ""], ["ids", "a"], ["ids", "b"]]));
    expect(result.success && result.data).toEqual({ link: null, agree: false, seats: null, ids: ["a", "b"] });
  });

  it("validates URLs and numbers", () => {
    const result = parseForm(schema, form([["link", "ftp://x"], ["seats", "-3"], ["agree", "on"], ["ids", "a"], ["ids", "b"]]));
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = z.flattenError(result.error).fieldErrors;
      expect(fields.link).toBeDefined();
      expect(fields.seats).toBeDefined();
    }
  });
});
