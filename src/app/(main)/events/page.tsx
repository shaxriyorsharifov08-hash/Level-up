import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { buildHref, FilterPills, SearchForm } from "@/components/filter-bar";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { EVENT_CATEGORIES } from "@/config/site";
import { EventCard } from "@/features/events/components/event-card";
import { getUserRegistrationMap, listEvents, type EventWindow } from "@/features/events/queries";
import { getCurrentUser } from "@/lib/auth";
import { oneOf, param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Events" };

const WINDOWS: { value: EventWindow; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "week", label: "Next 7 days" },
  { value: "past", label: "Past" },
];

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const category = oneOf(param(sp.category), EVENT_CATEGORIES);
  const window = oneOf(param(sp.when), ["upcoming", "week", "past"] as const) ?? "upcoming";

  const [user, events] = await Promise.all([getCurrentUser(), listEvents({ q, category, window })]);
  const mine = await getUserRegistrationMap(user?.id, events.map((e) => e.id));

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Workshops, talks, competitions and socials happening on campus." />
      <SearchForm action="/events" q={q} placeholder="Search events, places or organizers…" hidden={{ when: window === "upcoming" ? undefined : window }}>
        <Select name="category" defaultValue={category ?? ""} aria-label="Category" className="sm:w-48">
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </SearchForm>
      <FilterPills
        active={window}
        options={WINDOWS.map((w) => ({
          value: w.value,
          label: w.label,
          href: buildHref("/events", { q, category, when: w.value === "upcoming" ? undefined : w.value }),
        }))}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No events found"
          description={q || category ? "Try another search or category." : "Check back soon: clubs publish new events all the time."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} myStatus={mine.get(event.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
