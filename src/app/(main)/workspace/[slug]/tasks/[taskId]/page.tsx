import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgMembers, getWorkspace } from "@/features/organizations/queries";
import { deleteTask, updateTask } from "@/features/projects/actions";
import { EditTaskForm } from "@/features/projects/components/task-form";
import { getTask, getTaskFormOptions } from "@/features/projects/queries";
import { formatRelative, toDateInputValue } from "@/lib/dates";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: PageProps<"/workspace/[slug]/tasks/[taskId]">) {
  const { slug, taskId } = await params;
  const { user, org, access } = await getWorkspace(slug);
  const task = await getTask(taskId);
  if (!task || task.organizationId !== org.id) notFound();

  const [members, options] = await Promise.all([getOrgMembers(org.id), getTaskFormOptions(org.id)]);
  // Keep the current project/event selectable even if it's completed or older.
  const projects = task.project && !options.projects.some((p) => p.id === task.project!.id) ? [...options.projects, task.project] : options.projects;
  const events = task.event && !options.events.some((e) => e.id === task.event!.id) ? [...options.events, task.event] : options.events;
  const backHref = task.projectId ? `/workspace/${org.slug}/projects/${task.projectId}` : `/workspace/${org.slug}/tasks`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to {task.project ? task.project.title : "tasks"}
      </Link>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Edit task</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {formatRelative(task.createdAt)} · updated {formatRelative(task.updatedAt)}
            </p>
          </div>
          {(access.canManage || task.createdById === user.id) && (
            <ActionButton action={deleteTask.bind(null, task.id)} variant="ghost" size="sm" confirm="Delete this task?">
              <Trash2 /> Delete
            </ActionButton>
          )}
        </CardHeader>
        <CardContent>
          <EditTaskForm
            action={updateTask.bind(null, task.id)}
            members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
            projects={projects}
            events={events}
            values={{ ...task, dueDate: toDateInputValue(task.dueDate) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
