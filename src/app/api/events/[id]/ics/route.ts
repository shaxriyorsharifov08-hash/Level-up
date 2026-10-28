import { getEvent } from "@/features/events/queries";
import { getOrgAccess } from "@/features/organizations/queries";
import { getCurrentUser } from "@/lib/auth";
import { buildIcs } from "@/lib/ics";
import { slugify } from "@/lib/utils";

/** "Add to calendar": download a single event as an .ics file. */
export async function GET(request: Request, { params }: RouteContext<"/api/events/[id]/ics">) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return new Response("Not found", { status: 404 });

  if (event.status === "draft") {
    const user = await getCurrentUser();
    const access = await getOrgAccess(user, event.organization.id, event.organization.parentId);
    if (!access.canManage) return new Response("Not found", { status: 404 });
  }

  const url = new URL(`/events/${event.id}`, request.url).toString();
  const ics = buildIcs(
    [
      {
        uid: `${event.id}@level-up`,
        title: event.status === "cancelled" ? `CANCELLED: ${event.title}` : event.title,
        description: `${event.description}\n\nOrganized by ${event.organization.name}\n${url}`.trim(),
        location: event.location,
        url,
        start: event.startsAt,
        end: event.endsAt,
      },
    ],
    event.title,
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title) || "event"}.ics"`,
    },
  });
}
