import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { DateBadge, SpotsBadge } from "@/features/events/components/event-card";
import { listOrgEvents } from "@/features/events/queries";
import { getWorkspace } from "@/features/organizations/queries";
import { formatDateRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Events" };

export default async function WorkspaceEventsPage({ params }: PageProps<"/workspace/[slug]/events">) {
  const { slug } = await params;
  const { org, access } = await getWorkspace(slug);
  const events = await listOrgEvents(org.id);
  const visible = access.canManage ? events : events.filter((e) => e.status !== "draft");
  const now = new Date();
  const upcoming = visible.filter((e) => e.endsAt >= now).reverse();
  const past = visible.filter((e) => e.endsAt < now);

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Upcoming events"
        action={
          access.canManage && (
            <Link href={`/workspace/${org.slug}/events/new`} className={buttonVariants({ size: "sm" })}>
              <CalendarPlus /> New event
            </Link>
          )
        }
      />
      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No upcoming events" description="Plan your next meetup, workshop or competition." />
      ) : (
        <EventRows events={upcoming} slug={org.slug} canManage={access.canManage} />
      )}
      {past.length > 0 && (
        <div>
          <SectionHeader title="Past events" />
          <EventRows events={past} slug={org.slug} canManage={access.canManage} />
        </div>
      )}
    </div>
  );
}

function EventRows({
  events,
  slug,
  canManage,
}: {
  events: Awaited<ReturnType<typeof listOrgEvents>>;
  slug: string;
  canManage: boolean;
}) {
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <Card key={e.id} className="flex items-center gap-4 p-3">
          <DateBadge date={e.startsAt} className="bg-muted shadow-none" />
          <div className="min-w-0 flex-1">
            <Link
              href={canManage ? `/workspace/${slug}/events/${e.id}` : `/events/${e.id}`}
              className="truncate font-medium hover:underline"
            >
              {e.title}
            </Link>
            <p className="truncate text-sm text-muted-foreground">
              {formatDateRange(e.startsAt, e.endsAt)} · {e.location}
            </p>
          </div>
          <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
            {e.status === "draft" && <Badge variant="warning">Draft</Badge>}
            {e.status === "cancelled" && <Badge variant="danger">Cancelled</Badge>}
            <SpotsBadge capacity={e.capacity} registered={e.registered} waitlisted={e.waitlisted} />
          </div>
        </Card>
      ))}
    </div>
  );
}
