import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { buildIcs, escapeIcsText } from "@/lib/ics";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([["a,b", 'say "hi"', "line\nbreak"]])).toBe('"a,b","say ""hi""","line\nbreak"\r\n');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(toCsv([["=HYPERLINK(\"x\")", "+1", "-2", "@cmd"]])).toBe(`"'=HYPERLINK(""x"")",'+1,'-2,'@cmd\r\n`);
  });

  it("renders dates, numbers and empty values", () => {
    expect(toCsv([[new Date("2026-01-01T00:00:00Z"), 3, null, undefined]])).toBe("2026-01-01T00:00:00.000Z,3,,\r\n");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    [
      {
        uid: "1@test",
        title: "Pitch Night; demos, drinks",
        description: "Line one\nLine two",
        location: "Room 1",
        start: new Date("2026-03-10T13:00:00Z"),
        end: new Date("2026-03-10T15:30:00Z"),
      },
    ],
    "Test",
    new Date("2026-01-01T00:00:00Z"),
  );

  it("produces a valid calendar with UTC times", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260310T130000Z");
    expect(ics).toContain("DTEND:20260310T153000Z");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("escapes special characters", () => {
    expect(ics).toContain("SUMMARY:Pitch Night\\; demos\\, drinks");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
  });

  it("folds long lines to 75 octets", () => {
    const long = buildIcs([{ uid: "x", title: "x".repeat(200), start: new Date(0), end: new Date(1000) }]);
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
