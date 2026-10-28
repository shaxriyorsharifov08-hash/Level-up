import { getMeetingForUser } from "@/features/meetings/queries";
import { getCurrentUser } from "@/lib/auth";
import { buildIcs } from "@/lib/ics";
import { slugify } from "@/lib/utils";

/** Download a team meeting as .ics (members of the organization only). */
export async function GET(request: Request, { params }: RouteContext<"/api/meetings/[id]/ics">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const row = await getMeetingForUser((await params).id, user.id);
  if (!row) return new Response("Not found", { status: 404 });

  const { meeting, organization } = row;
  const url = new URL(`/workspace/${organization.slug}/calendar`, request.url).toString();
  const ics = buildIcs(
    [
      {
        uid: `${meeting.id}@level-up`,
        title: `${organization.name}: ${meeting.title}`,
        description: [meeting.description, meeting.meetingUrl].filter(Boolean).join("\n\n"),
        location: meeting.location || meeting.meetingUrl || "",
        url,
        start: meeting.startsAt,
        end: meeting.endsAt,
      },
    ],
    meeting.title,
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(meeting.title) || "meeting"}.ics"`,
    },
  });
}
