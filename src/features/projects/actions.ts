"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, memberships, organizations, projects, tasks, type TaskStatus } from "@/db/schema";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import {
  checkbox,
  type FormState,
  invalid,
  optionalLocalDateTime,
  optionalUrl,
  parseForm,
  requiredText,
} from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { notify } from "@/features/notifications/service";
import { getOrgAccess } from "@/features/organizations/queries";

async function orgAccessFor(user: CurrentUser, orgId: string) {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) return null;
  return { org, access: await getOrgAccess(user, org.id, org.parentId) };
}

/* -------------------------------- Projects -------------------------------- */

const projectSchema = z.object({
  title: requiredText(120, "Title"),
  summary: z.string().trim().max(200, "Keep the summary under 200 characters").default(""),
  description: z.string().trim().max(10000, "Too long").default(""),
  status: z.enum(["planning", "active", "on_hold", "completed"]),
  isPublic: checkbox,
  lookingForContributors: checkbox,
  coverUrl: optionalUrl,
  dueDate: optionalLocalDateTime,
});

export async function createProject(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await orgAccessFor(user, orgId);
  if (!ctx?.access.canManage) return { error: "Only organizers can create projects." };

  const parsed = parseForm(projectSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const [project] = await db
    .insert(projects)
    .values({ ...parsed.data, organizationId: orgId, createdById: user.id })
    .returning({ id: projects.id });
  refreshAll();
  redirect(`/workspace/${ctx.org.slug}/projects/${project.id}`);
}

async function managedProject(user: CurrentUser, projectId: string) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return null;
  const ctx = await orgAccessFor(user, project.organizationId);
  return ctx?.access.canManage ? { project, org: ctx.org } : null;
}

export async function updateProject(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await managedProject(user, projectId);
  if (!ctx) return { error: "Only organizers can edit projects." };

  const parsed = parseForm(projectSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  await db.update(projects).set(parsed.data).where(eq(projects.id, projectId));
  refreshAll();
  return { ok: true, message: "Project saved." };
}

export async function deleteProject(projectId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await managedProject(user, projectId);
  if (!ctx) return { error: "Not allowed." };
  await db.delete(projects).where(eq(projects.id, projectId));
  refreshAll();
  redirect(`/workspace/${ctx.org.slug}/projects`);
}

/* ---------------------------------- Tasks --------------------------------- */

const optionalId = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .transform((v) => v || null);

const taskSchema = z.object({
  title: requiredText(200, "Title"),
  description: z.string().trim().max(5000, "Too long").default(""),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigneeId: optionalId,
  projectId: optionalId,
  eventId: optionalId,
  dueDate: optionalLocalDateTime,
});

/** Make sure referenced assignee/project/event belong to the same organization. */
async function validateTaskRefs(
  orgId: string,
  data: { assigneeId: string | null; projectId: string | null; eventId: string | null },
): Promise<FormState> {
  if (data.assigneeId) {
    const member = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.organizationId, orgId),
        eq(memberships.userId, data.assigneeId),
        eq(memberships.status, "active"),
      ),
    });
    if (!member) return { fieldErrors: { assigneeId: ["Tasks can only be assigned to team members"] } };
  }
  if (data.projectId) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, data.projectId), eq(projects.organizationId, orgId)),
    });
    if (!project) return { fieldErrors: { projectId: ["Unknown project"] } };
  }
  if (data.eventId) {
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, data.eventId), eq(events.organizationId, orgId)),
    });
    if (!event) return { fieldErrors: { eventId: ["Unknown event"] } };
  }
  return null;
}

async function notifyAssignee(
  task: { id: string; title: string; assigneeId: string | null; dueDate: Date | null },
  orgSlug: string,
  actor: CurrentUser,
) {
  await notify(
    [task.assigneeId],
    {
      title: `${actor.name} assigned you: ${task.title}`,
      body: task.dueDate ? `Due ${formatDate(task.dueDate)}` : undefined,
      link: `/workspace/${orgSlug}/tasks/${task.id}`,
    },
    { exclude: actor.id },
  );
}

export async function createTask(orgId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await orgAccessFor(user, orgId);
  if (!ctx?.access.canView) return { error: "Only team members can add tasks." };

  const parsed = parseForm(taskSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const refError = await validateTaskRefs(orgId, parsed.data);
  if (refError) return refError;

  const [task] = await db
    .insert(tasks)
    .values({
      ...parsed.data,
      organizationId: orgId,
      createdById: user.id,
      completedAt: parsed.data.status === "done" ? new Date() : null,
    })
    .returning();
  await notifyAssignee(task, ctx.org.slug, user);
  refreshAll();
  return { ok: true, message: "Task added." };
}

async function taskForMember(user: CurrentUser, taskId: string) {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) return null;
  const ctx = await orgAccessFor(user, task.organizationId);
  return ctx?.access.canView ? { task, ...ctx } : null;
}

export async function updateTask(taskId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const ctx = await taskForMember(user, taskId);
  if (!ctx) return { error: "Not allowed." };

  const parsed = parseForm(taskSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const refError = await validateTaskRefs(ctx.org.id, parsed.data);
  if (refError) return refError;

  const completedAt =
    parsed.data.status === "done" ? (ctx.task.completedAt ?? new Date()) : null;
  const [updated] = await db
    .update(tasks)
    .set({ ...parsed.data, completedAt })
    .where(eq(tasks.id, taskId))
    .returning();
  if (updated.assigneeId !== ctx.task.assigneeId) await notifyAssignee(updated, ctx.org.slug, user);
  refreshAll();
  return { ok: true, message: "Task saved." };
}

/** Used by the kanban board when a card is dragged to another column. */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<FormState> {
  const user = await requireUser();
  if (!["todo", "in_progress", "review", "done"].includes(status)) return { error: "Invalid status." };
  const ctx = await taskForMember(user, taskId);
  if (!ctx) return { error: "Not allowed." };

  await db
    .update(tasks)
    .set({ status, completedAt: status === "done" ? (ctx.task.completedAt ?? new Date()) : null })
    .where(eq(tasks.id, taskId));
  refreshAll();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<FormState> {
  const user = await requireUser();
  const ctx = await taskForMember(user, taskId);
  if (!ctx || (!ctx.access.canManage && ctx.task.createdById !== user.id)) {
    return { error: "Only organizers or the task's creator can delete it." };
  }
  await db.delete(tasks).where(eq(tasks.id, taskId));
  refreshAll();
  redirect(ctx.task.projectId ? `/workspace/${ctx.org.slug}/projects/${ctx.task.projectId}` : `/workspace/${ctx.org.slug}/tasks`);
}
