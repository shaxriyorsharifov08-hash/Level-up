"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { meetings, organizations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateRange } from "@/lib/dates";
import { type FormState, invalid, localDateTime, optionalUrl, parseForm, requiredText } from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { notify } from "@/features/notifications/service";
import { getActiveMemberIds, getOrgAccess } from "@/features/organizations/queries";

const meetingSchema = z
  .object({
    title: requiredText(120, "Title"),
    description: z.string().trim().max(5000, "Too long").default(""),
    location: z.string().trim().max(200, "Too long").default(""),
    meetingUrl: optionalUrl,
    startsAt: localDateTime("Start"),
    endsAt: localDateTime("End"),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "End must be after the start" });

export async function createMeeting(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) return { error: "Organization not found." };
  const access = await getOrgAccess(user, org.id, org.parentId);
  if (!access.canView) return { error: "Only team members can schedule meetings." };

  const parsed = parseForm(meetingSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const [meeting] = await db
    .insert(meetings)
    .values({ ...parsed.data, organizationId: org.id, createdById: user.id })
    .returning();
  await notify(
    await getActiveMemberIds(org.id),
    {
      title: `${org.name}: ${meeting.title}`,
      body: `${user.name} scheduled a meeting · ${formatDateRange(meeting.startsAt, meeting.endsAt)}`,
      link: `/workspace/${org.slug}/calendar#meeting-${meeting.id}`,
    },
    { exclude: user.id },
  );
  refreshAll();
  return { ok: true, message: "Meeting scheduled. Your team has been notified." };
}

export async function deleteMeeting(meetingId: string): Promise<FormState> {
  const user = await requireUser();
  const meeting = await db.query.meetings.findFirst({ where: eq(meetings.id, meetingId) });
  if (!meeting) return { error: "Meeting not found." };
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, meeting.organizationId) });
  const access = await getOrgAccess(user, meeting.organizationId, org?.parentId ?? null);
  if (!access.canManage && meeting.createdById !== user.id) {
    return { error: "Only organizers or the person who scheduled it can cancel a meeting." };
  }

  await db.delete(meetings).where(eq(meetings.id, meetingId));
  if (org) {
    await notify(
      await getActiveMemberIds(org.id),
      { title: `Meeting cancelled: ${meeting.title}`, body: formatDateRange(meeting.startsAt, meeting.endsAt), link: `/workspace/${org.slug}/calendar` },
      { exclude: user.id },
    );
  }
  refreshAll();
  return { ok: true };
}
