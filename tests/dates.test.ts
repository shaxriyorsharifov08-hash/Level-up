import { describe, expect, it } from "vitest";
import {
  dayKey,
  monthGrid,
  nextDayKey,
  parseLocalDateTime,
  shiftMonth,
  toDateTimeLocalValue,
  zonedTimeToUtc,
} from "@/lib/dates";

describe("zonedTimeToUtc", () => {
  it("converts wall-clock time in a fixed-offset zone", () => {
    // Tashkent is UTC+5 all year.
    expect(zonedTimeToUtc(2026, 3, 10, 18, 0, "Asia/Tashkent").toISOString()).toBe("2026-03-10T13:00:00.000Z");
  });

  it("handles daylight saving time", () => {
    // Berlin: UTC+1 in winter, UTC+2 in summer.
    expect(zonedTimeToUtc(2026, 1, 15, 12, 0, "Europe/Berlin").toISOString()).toBe("2026-01-15T11:00:00.000Z");
    expect(zonedTimeToUtc(2026, 7, 15, 12, 0, "Europe/Berlin").toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("rolls over day overflow", () => {
    expect(zonedTimeToUtc(2026, 1, 32, 0, 0, "UTC").toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("datetime-local round trip", () => {
  it("parses and formats in the same zone", () => {
    const date = parseLocalDateTime("2026-11-05T09:30", "Asia/Tashkent")!;
    expect(date.toISOString()).toBe("2026-11-05T04:30:00.000Z");
    expect(toDateTimeLocalValue(date, "Asia/Tashkent")).toBe("2026-11-05T09:30");
  });

  it("accepts plain dates and rejects garbage", () => {
    expect(parseLocalDateTime("2026-11-05", "UTC")!.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(parseLocalDateTime("not a date", "UTC")).toBeNull();
  });

  it("computes the calendar day in the target zone", () => {
    // 22:00 UTC is already the next day in Tashkent.
    expect(dayKey(new Date("2026-10-28T22:00:00Z"), "Asia/Tashkent")).toBe("2026-10-29");
  });
});

describe("calendar helpers", () => {
  it("builds Monday-first month grids that cover the month", () => {
    const weeks = monthGrid(2026, 10); // October 2026 starts on a Thursday
    expect(weeks[0][0].key).toBe("2026-09-28");
    expect(weeks[0][3]).toMatchObject({ key: "2026-10-01", inMonth: true });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it("steps across month and year boundaries", () => {
    expect(nextDayKey("2026-12-31")).toBe("2027-01-01");
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
