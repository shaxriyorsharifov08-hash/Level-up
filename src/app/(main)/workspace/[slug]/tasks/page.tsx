import type { Metadata } from "next";
import { buildHref, FilterPills } from "@/components/filter-bar";
import { getOrgMembers, getWorkspace } from "@/features/organizations/queries";
import { createTask, updateTaskStatus } from "@/features/projects/actions";
import { TaskBoard } from "@/features/projects/components/task-board";
import { NewTaskForm } from "@/features/projects/components/task-form";
import { getTaskFormOptions, listTasks } from "@/features/projects/queries";
import { param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Tasks" };

export default async function WorkspaceTasksPage({ params, searchParams }: PageProps<"/workspace/[slug]/tasks">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { user, org } = await getWorkspace(slug);
  const mine = param(sp.filter) === "mine";
  const projectId = param(sp.project);

  const [tasks, members, options] = await Promise.all([
    listTasks({ organizationId: org.id, assigneeId: mine ? user.id : undefined, projectId }),
    getOrgMembers(org.id),
    getTaskFormOptions(org.id),
  ]);
  const base = `/workspace/${org.slug}/tasks`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills
          active={mine ? "mine" : (projectId ?? "all")}
          options={[
            { value: "all", label: "All tasks", href: base },
            { value: "mine", label: "Assigned to me", href: buildHref(base, { filter: "mine" }) },
            ...options.projects.map((p) => ({ value: p.id, label: p.title, href: buildHref(base, { project: p.id }) })),
          ]}
        />
      </div>
      <NewTaskForm
        action={createTask.bind(null, org.id)}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        projects={options.projects}
        events={options.events}
      />
      <TaskBoard tasks={tasks} moveTask={updateTaskStatus} />
    </div>
  );
}
