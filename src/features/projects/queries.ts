import "server-only";
import { cache } from "react";
import { aliasedTable, and, asc, count, desc, eq, ilike, inArray, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations, projects, tasks, users, type ProjectStatus, type TaskStatus } from "@/db/schema";
import { dayKey, formatDate } from "@/lib/dates";

const orgColumns = {
  id: organizations.id,
  slug: organizations.slug,
  name: organizations.name,
  logoUrl: organizations.logoUrl,
  parentId: organizations.parentId,
};

/** Task totals per project, used for progress bars. */
export async function getProjectProgress(projectIds: string[]) {
  const result = new Map<string, { total: number; done: number; percent: number }>();
  for (const id of projectIds) result.set(id, { total: 0, done: 0, percent: 0 });
  if (projectIds.length === 0) return result;
  const rows = await db
    .select({ projectId: tasks.projectId, status: tasks.status, n: count() })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId, tasks.status);
  for (const r of rows) {
    const entry = result.get(r.projectId!)!;
    entry.total += r.n;
    if (r.status === "done") entry.done += r.n;
  }
  for (const entry of result.values()) entry.percent = entry.total ? Math.round((entry.done / entry.total) * 100) : 0;
  return result;
}

export async function listPublicProjects({
  q,
  status,
  contributors,
  limit = 48,
}: { q?: string; status?: ProjectStatus; contributors?: boolean; limit?: number } = {}) {
  const filters: (SQL | undefined)[] = [eq(projects.isPublic, true)];
  if (status) filters.push(eq(projects.status, status));
  if (contributors) filters.push(eq(projects.lookingForContributors, true));
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(or(ilike(projects.title, pattern), ilike(projects.summary, pattern), ilike(organizations.name, pattern)));
  }
  const rows = await db
    .select({ project: projects, organization: orgColumns })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(and(...filters))
    .orderBy(desc(projects.lookingForContributors), desc(projects.updatedAt))
    .limit(limit);
  const progress = await getProjectProgress(rows.map((r) => r.project.id));
  return rows.map((r) => ({ ...r.project, organization: r.organization, progress: progress.get(r.project.id)! }));
}

export type ProjectListItem = Awaited<ReturnType<typeof listPublicProjects>>[number];

export async function listOrgProjects(orgId: string, { includePrivate }: { includePrivate: boolean }) {
  const rows = await db
    .select({ project: projects, organization: orgColumns })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(and(eq(projects.organizationId, orgId), includePrivate ? undefined : eq(projects.isPublic, true)))
    .orderBy(asc(projects.status), desc(projects.updatedAt));
  const progress = await getProjectProgress(rows.map((r) => r.project.id));
  return rows.map((r) => ({ ...r.project, organization: r.organization, progress: progress.get(r.project.id)! }));
}

export const getProject = cache(async (projectId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return undefined;
  const [row] = await db
    .select({ project: projects, organization: { ...orgColumns, telegramUrl: organizations.telegramUrl, instagramUrl: organizations.instagramUrl } })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ? { ...row.project, organization: row.organization } : undefined;
});

/** Task shape sent to the (client) board: dates are pre-formatted on the server. */
export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueLabel: string | null;
  overdue: boolean;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
  project: { id: string; title: string } | null;
  organization: { slug: string; name: string };
};

const assignee = aliasedTable(users, "assignee");

export async function listTasks({
  organizationId,
  projectId,
  assigneeId,
  includeDone = true,
}: {
  organizationId?: string;
  projectId?: string;
  assigneeId?: string;
  includeDone?: boolean;
}): Promise<BoardTask[]> {
  const rows = await db
    .select({
      task: tasks,
      assignee: { id: assignee.id, name: assignee.name, avatarUrl: assignee.avatarUrl },
      project: { id: projects.id, title: projects.title },
      organization: { slug: organizations.slug, name: organizations.name },
    })
    .from(tasks)
    .innerJoin(organizations, eq(organizations.id, tasks.organizationId))
    .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        organizationId ? eq(tasks.organizationId, organizationId) : undefined,
        projectId ? eq(tasks.projectId, projectId) : undefined,
        assigneeId ? eq(tasks.assigneeId, assigneeId) : undefined,
        includeDone ? undefined : ne(tasks.status, "done"),
      ),
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.createdAt));

  const today = dayKey(new Date());
  return rows.map(({ task, assignee, project, organization }) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueLabel: task.dueDate ? formatDate(task.dueDate) : null,
    overdue: !!task.dueDate && task.status !== "done" && dayKey(task.dueDate) < today,
    assignee: assignee?.id ? assignee : null,
    project: project?.id ? project : null,
    organization,
  }));
}

export async function getTask(taskId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return undefined;
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      assignee: { columns: { id: true, name: true, avatarUrl: true } },
      project: { columns: { id: true, title: true } },
      event: { columns: { id: true, title: true } },
    },
  });
}

/** Options for task forms: the org's projects and upcoming events. */
export async function getTaskFormOptions(orgId: string) {
  const [projectRows, eventRows] = await Promise.all([
    db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), ne(projects.status, "completed")))
      .orderBy(asc(projects.title)),
    db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(and(eq(events.organizationId, orgId), ne(events.status, "cancelled")))
      .orderBy(desc(events.startsAt))
      .limit(20),
  ]);
  return { projects: projectRows, events: eventRows };
}

/** Counts of tasks per status for an organization (workspace overview). */
export async function getTaskStats(orgId: string) {
  const rows = await db
    .select({ status: tasks.status, n: count() })
    .from(tasks)
    .where(eq(tasks.organizationId, orgId))
    .groupBy(tasks.status);
  const stats: Record<TaskStatus, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const r of rows) stats[r.status] = r.n;
  return stats;
}
