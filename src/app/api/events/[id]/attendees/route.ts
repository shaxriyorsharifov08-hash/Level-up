import { getAttendees, getEvent } from "@/features/events/queries";
import { getOrgAccess } from "@/features/organizations/queries";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { slugify } from "@/lib/utils";

/** Attendee list as CSV, for organizers only. */
export async function GET(_request: Request, { params }: RouteContext<"/api/events/[id]/attendees">) {
  const { id } = await params;
  const [user, event] = await Promise.all([getCurrentUser(), getEvent(id)]);
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!event) return new Response("Not found", { status: 404 });

  const access = await getOrgAccess(user, event.organization.id, event.organization.parentId);
  if (!access.canManage) return new Response("Not found", { status: 404 });

  const attendees = await getAttendees(event.id);
  const csv = toCsv([
    ["Name", "E-mail", "Faculty", "Status", "Registered at", "Checked in at"],
    ...attendees.map((a) => [a.user.name, a.user.email, a.user.faculty, a.status, a.registeredAt, a.checkedInAt]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title) || "event"}-attendees.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
