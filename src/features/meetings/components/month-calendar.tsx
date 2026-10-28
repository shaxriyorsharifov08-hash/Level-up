import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  dayKey,
  formatDate,
  formatMonth,
  formatTime,
  monthGrid,
  monthParam,
  nextDayKey,
  parseLocalDateTime,
  shiftMonth,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "../queries";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** UTC range covering every day shown in the month grid (including leading/trailing days). */
export function calendarRange(year: number, month: number) {
  const weeks = monthGrid(year, month);
  const first = weeks[0][0].key;
  const last = weeks[weeks.length - 1][6].key;
  return { from: parseLocalDateTime(first)!, to: parseLocalDateTime(nextDayKey(last))! };
}

function groupByDay(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    let key = dayKey(item.startsAt);
    const endKey = dayKey(new Date(Math.max(item.startsAt.getTime(), item.endsAt.getTime() - 1)));
    // Multi-day items appear on every day they span (capped to avoid runaway loops).
    for (let i = 0; i < 42; i++) {
      map.set(key, [...(map.get(key) ?? []), item]);
      if (key >= endKey) break;
      key = nextDayKey(key);
    }
  }
  return map;
}

const chipStyle = (item: CalendarItem) =>
  item.kind === "meeting"
    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    : item.highlight
      ? "bg-primary text-primary-foreground"
      : "bg-primary-soft text-primary-text";

export function MonthCalendar({
  year,
  month,
  items,
  basePath,
}: {
  year: number;
  month: number;
  items: CalendarItem[];
  basePath: string;
}) {
  const weeks = monthGrid(year, month);
  const byDay = groupByDay(items);
  const todayKey = dayKey(new Date());
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const monthPrefix = monthParam(year, month);
  const agendaDays = [...byDay.keys()].filter((k) => k.startsWith(monthPrefix)).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{formatMonth(year, month)}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={`${basePath}?month=${monthParam(prev.year, prev.month)}`}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Link>
          <Link href={basePath} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Today
          </Link>
          <Link
            href={`${basePath}?month=${monthParam(next.year, next.month)}`}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Next month"
          >
            <ChevronRight />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> Registered event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary-soft ring-1 ring-primary/40" /> Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" /> Meeting
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, index) => {
            const dayItems = byDay.get(day.key) ?? [];
            const isToday = day.key === todayKey;
            return (
              <div
                key={day.key}
                className={cn(
                  "min-h-16 border-border p-1 sm:min-h-28 sm:p-1.5",
                  index % 7 !== 6 && "border-r",
                  index < weeks.length * 7 - 7 && "border-b",
                  !day.inMonth && "bg-muted/40",
                )}
              >
                <div className="flex justify-center sm:justify-start">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      isToday && "bg-primary font-semibold text-primary-foreground",
                      !isToday && !day.inMonth && "text-muted-foreground/60",
                    )}
                  >
                    {day.day}
                  </span>
                </div>
                {/* Mobile: dots. Desktop: chips. */}
                <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {dayItems.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        item.kind === "meeting" ? "bg-emerald-500" : item.highlight ? "bg-primary" : "bg-primary/40",
                      )}
                    />
                  ))}
                </div>
                <div className="mt-1 hidden space-y-1 sm:block">
                  {dayItems.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={`${formatTime(item.startsAt)} ${item.title}`}
                      className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:opacity-80", chipStyle(item))}
                    >
                      {formatTime(item.startsAt)} {item.title}
                    </Link>
                  ))}
                  {dayItems.length > 3 && (
                    <p className="px-1.5 text-[11px] text-muted-foreground">+{dayItems.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Agenda</h3>
        {agendaDays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing scheduled this month.
          </p>
        ) : (
          <div className="space-y-4">
            {agendaDays.map((key) => (
              <div key={key} className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                <p className={cn("text-sm font-medium", key === todayKey && "text-primary-text")}>
                  {formatDate(parseLocalDateTime(key)!)}
                  {key === todayKey && " · Today"}
                </p>
                <div className="space-y-2">
                  {byDay.get(key)!.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "h-9 w-1 shrink-0 rounded-full",
                          item.kind === "meeting" ? "bg-emerald-500" : item.highlight ? "bg-primary" : "bg-primary/40",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatTime(item.startsAt)}–{formatTime(item.endsAt)} · {item.kind === "meeting" ? "Meeting" : "Event"} ·{" "}
                          {item.subtitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
