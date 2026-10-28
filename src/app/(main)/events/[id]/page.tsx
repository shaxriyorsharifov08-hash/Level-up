import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, CalendarPlus, MapPin, Settings2, Users } from "lucide-react";
import { SocialLinks } from "@/components/icons";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cover } from "@/components/ui/misc";
import { cancelRegistration, registerForEvent } from "@/features/events/actions";
import { SpotsBadge } from "@/features/events/components/event-card";
import { RegistrationPanel } from "@/features/events/components/registration-panel";
import { getAttendeePreview, getEvent, getRegistrationCounts, getUserRegistrationMap } from "@/features/events/queries";
import { registrationBlocker } from "@/features/events/registration";
import { getOrgAccess } from "@/features/organizations/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatDateRange, formatLongDate, TIMEZONE } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await getEvent((await params).id);
  if (!event || event.status === "draft") return { title: "Event" };
  return { title: event.title, description: event.description.slice(0, 160) };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const [user, event] = await Promise.all([getCurrentUser(), getEvent(id)]);
  if (!event) notFound();

  const access = await getOrgAccess(user, event.organization.id, event.organization.parentId);
  if (event.status === "draft" && !access.canManage) notFound();

  const [counts, mine, attendees] = await Promise.all([
    getRegistrationCounts([event.id]),
    getUserRegistrationMap(user?.id, [event.id]),
    user ? getAttendeePreview(event.id) : Promise.resolve([]),
  ]);
  const { registered, waitlisted } = counts.get(event.id)!;
  const myStatus = mine.get(event.id);
  const full = event.capacity !== null && registered >= event.capacity;

  return (
    <div className="space-y-6">
      <Cover src={event.coverUrl} seed={event.id} label={event.title} className="h-48 rounded-2xl sm:h-64">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge className="bg-white/20 text-white backdrop-blur">{event.category}</Badge>
            {event.status === "cancelled" && <Badge variant="danger">Cancelled</Badge>}
            {event.status === "draft" && <Badge variant="warning">Draft</Badge>}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        </div>
      </Cover>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{formatLongDate(event.startsAt)}</p>
                  <p className="text-sm text-muted-foreground">{formatDateRange(event.startsAt, event.endsAt)}</p>
                  <p className="text-xs text-muted-foreground">{TIMEZONE}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                  <MapPin className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm break-words text-muted-foreground">{event.location || "To be announced"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 text-lg font-semibold">About this event</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {event.description || "No description provided."}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  {registered} going{event.capacity !== null && ` · ${pluralize(event.capacity, "seat")}`}
                </span>
                {event.status !== "cancelled" && (
                  <SpotsBadge capacity={event.capacity} registered={registered} waitlisted={waitlisted} />
                )}
              </div>
              {attendees.length > 0 && <AvatarStack people={attendees} max={6} />}

              {user ? (
                <RegistrationPanel
                  status={myStatus}
                  blocker={registrationBlocker(event)}
                  full={full}
                  register={registerForEvent.bind(null, event.id)}
                  cancel={cancelRegistration.bind(null, event.id)}
                />
              ) : (
                <Link href={`/login?next=/events/${event.id}`} className={buttonVariants({ size: "lg", className: "w-full" })}>
                  Sign in to register
                </Link>
              )}

              <a
                href={`/api/events/${event.id}/ics`}
                className={buttonVariants({ variant: "ghost", className: "w-full" })}
              >
                <CalendarPlus /> Add to calendar
              </a>
              {access.canManage && (
                <Link
                  href={`/workspace/${event.organization.slug}/events/${event.id}`}
                  className={buttonVariants({ variant: "outline", className: "w-full" })}
                >
                  <Settings2 /> Manage event
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Organized by</p>
              <Link href={`/clubs/${event.organization.slug}`} className="flex items-center gap-3 hover:opacity-80">
                <Avatar
                  name={event.organization.name}
                  src={event.organization.logoUrl}
                  seed={event.organization.id}
                  size="md"
                  square
                />
                <span className="flex items-center gap-1 font-medium">
                  {event.organization.name}
                  {event.organization.verified && <BadgeCheck className="size-4 text-primary-text" />}
                </span>
              </Link>
              <SocialLinks
                telegramUrl={event.organization.telegramUrl}
                instagramUrl={event.organization.instagramUrl}
                variant="icon"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
