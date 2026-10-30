/**
 * Time-zone aware date helpers.
 *
 * All timestamps are stored in UTC. They are displayed, and entered through
 * <input type="datetime-local">, in the university's time zone
 * (NEXT_PUBLIC_UNIVERSITY_TIMEZONE), regardless of where the server runs.
 */
import { siteConfig } from "@/config/site";

export const TIMEZONE = siteConfig.university.timezone;
const LOCALE = "en-GB";

type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Monday ... 6 = Sunday
};

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getZonedParts(date: Date, timeZone = TIMEZONE): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds. */
function timeZoneOffset(date: Date, timeZone: string) {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a wall-clock time in `timeZone` to the corresponding UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  timeZone = TIMEZONE,
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = timeZoneOffset(new Date(guess), timeZone);
  let result = guess - firstOffset;
  // Correct the guess once more around DST transitions.
  const secondOffset = timeZoneOffset(new Date(result), timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the date in the university time zone. */
export function dayKey(date: Date, timeZone = TIMEZONE) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Value for <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") in the university time zone. */
export function toDateTimeLocalValue(date: Date | null | undefined, timeZone = TIMEZONE) {
  if (!date) return "";
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Value for <input type="date"> ("YYYY-MM-DD") in the university time zone. */
export function toDateInputValue(date: Date | null | undefined, timeZone = TIMEZONE) {
  return date ? dayKey(date, timeZone) : "";
}

/** Parse "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" (university time zone) into a UTC Date. */
export function parseLocalDateTime(value: string, timeZone = TIMEZONE): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = zonedTimeToUtc(Number(y), Number(mo), Number(d), Number(h ?? 0), Number(mi ?? 0), timeZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, ...options }).format(date);
}

/** "Tue 28 Oct" */
export function formatDate(date: Date) {
  return format(date, { weekday: "short", day: "numeric", month: "short" });
}

/** "28 October 2026" */
export function formatLongDate(date: Date) {
  return format(date, { day: "numeric", month: "long", year: "numeric" });
}

/** "18:30" */
export function formatTime(date: Date) {
  return format(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** "Tue 28 Oct, 18:30" */
export function formatDateTime(date: Date) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** "Tue 28 Oct, 18:00 – 20:00" or "Tue 28 Oct, 18:00 – Wed 29 Oct, 10:00" */
export function formatDateRange(start: Date, end: Date) {
  if (dayKey(start) === dayKey(end)) {
    return `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
  }
  return `${formatDateTime(start)} – ${formatDateTime(end)}`;
}

/** "October 2026" */
export function formatMonth(year: number, month: number) {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** Short relative time: "just now", "5m", "3h", "2d", or a date. */
export function formatRelative(date: Date, now = new Date()) {
  const diff = Math.round((now.getTime() - date.getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)}d ago`;
  return formatDate(date);
}

/** Calendar month grid (weeks start on Monday) as arrays of "YYYY-MM-DD" keys. */
export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(Date.UTC(year, month - 1, 1 - firstWeekday));
  const weeks: { key: string; day: number; inMonth: boolean }[][] = [];
  const cursor = new Date(start);
  while (weeks.length < 6) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        key: `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`,
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month - 1,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    // Stop early when the month has been fully covered.
    if (cursor.getUTCMonth() !== month - 1 && weeks.length >= 4) break;
  }
  return weeks;
}

/** The "YYYY-MM-DD" key of the following calendar day. */
export function nextDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Parse "YYYY-MM" (or fall back to the current month in the university time zone). */
export function parseMonthParam(value: string | undefined, now = new Date()) {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const p = getZonedParts(now);
  return { year: p.year, month: p.month };
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthParam(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

/** UTC range [start, end) covering the whole month in the university time zone. */
export function monthRange(year: number, month: number) {
  const next = shiftMonth(year, month, 1);
  return {
    start: zonedTimeToUtc(year, month, 1),
    end: zonedTimeToUtc(next.year, next.month, 1),
  };
}
