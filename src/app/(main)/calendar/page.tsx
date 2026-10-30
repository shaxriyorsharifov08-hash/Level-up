import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { calendarRange, MonthCalendar } from "@/features/meetings/components/month-calendar";
import { getPersonalCalendar } from "@/features/meetings/queries";
import { requireUser } from "@/lib/auth";
import { parseMonthParam } from "@/lib/dates";
import { param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser("/calendar");
  const { year, month } = parseMonthParam(param((await searchParams).month));
  const { from, to } = calendarRange(year, month);
  const items = await getPersonalCalendar(user.id, from, to);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Events you're attending, plus events and meetings from your teams."
      />
      <MonthCalendar year={year} month={month} items={items} basePath="/calendar" />
    </div>
  );
}
