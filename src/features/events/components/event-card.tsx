import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Cover } from "@/components/ui/misc";
import { formatDateRange, getZonedParts } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { RegistrationStatus } from "@/db/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DateBadge({ date, className }: { date: Date; className?: string }) {
  const p = getZonedParts(date);
  return (
    <div
      className={cn(
        "flex w-12 flex-col items-center rounded-lg bg-card/95 py-1 text-center shadow-sm backdrop-blur",
        className,
      )}
    >
      <span className="text-[10px] font-semibold tracking-wide text-primary-text uppercase">{MONTHS[p.month - 1]}</span>
      <span className="text-lg leading-none font-bold text-card-foreground">{p.day}</span>
    </div>
  );
}

export function SpotsBadge({
  capacity,
  registered,
  waitlisted,
}: {
  capacity: number | null;
  registered: number;
  waitlisted?: number;
}) {
  if (capacity === null) return <Badge variant="outline">{registered} going</Badge>;
  const left = capacity - registered;
  if (left <= 0) return <Badge variant="warning">Full{waitlisted ? ` · ${waitlisted} waiting` : ""}</Badge>;
  if (left <= Math.max(3, capacity * 0.1)) return <Badge variant="warning">{left} spots left</Badge>;
  return <Badge variant="success">{left} spots left</Badge>;
}

export function MyStatusBadge({ status }: { status: RegistrationStatus | undefined }) {
  if (status === "registered") return <Badge variant="primary">You&apos;re going</Badge>;
  if (status === "waitlisted") return <Badge variant="warning">Waitlisted</Badge>;
  return null;
}

type CardEvent = {
  id: string;
  title: string;
  category: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  coverUrl: string | null;
  status: string;
  registered: number;
  waitlisted: number;
  organization: { name: string };
};

export function EventCard({ event, myStatus }: { event: CardEvent; myStatus?: RegistrationStatus }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <Cover src={event.coverUrl} seed={event.id} label={event.title} className="h-32">
        <DateBadge date={event.startsAt} className="absolute top-3 left-3" />
        <Badge className="absolute top-3 right-3 bg-black/40 text-white backdrop-blur">{event.category}</Badge>
      </Cover>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium text-primary-text">{event.organization.name}</p>
        <h3 className="line-clamp-2 font-semibold group-hover:text-primary-text">{event.title}</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="truncate">{formatDateRange(event.startsAt, event.endsAt)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{event.location || "TBA"}</span>
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {event.status === "cancelled" ? (
            <Badge variant="danger">Cancelled</Badge>
          ) : (
            <SpotsBadge capacity={event.capacity} registered={event.registered} waitlisted={event.waitlisted} />
          )}
          <MyStatusBadge status={myStatus} />
        </div>
      </div>
    </Link>
  );
}
