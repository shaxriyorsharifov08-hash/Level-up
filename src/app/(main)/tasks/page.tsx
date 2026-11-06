import type { Metadata } from "next";
import { ListTodo } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { updateTaskStatus } from "@/features/projects/actions";
import { TaskBoard } from "@/features/projects/components/task-board";
import { listTasks } from "@/features/projects/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage() {
  const user = await requireUser("/tasks");
  const tasks = await listTasks({ assigneeId: user.id });
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.overdue).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My tasks"
        description={
          tasks.length === 0
            ? "Tasks assigned to you in any of your teams show up here."
            : `${open.length} open${overdue ? ` · ${overdue} overdue` : ""} across all your teams.`
        }
      />
      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nothing assigned to you" description="Enjoy the calm, or pick something up in your workspaces." />
      ) : (
        <TaskBoard tasks={tasks} moveTask={updateTaskStatus} showOrganization />
      )}
    </div>
  );
}
