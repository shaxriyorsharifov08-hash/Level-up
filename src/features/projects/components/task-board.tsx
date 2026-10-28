"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { CalendarDays, Flag, FolderKanban } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { TaskStatus } from "@/db/schema";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { TASK_COLUMNS } from "../constants";
import type { BoardTask } from "../queries";

const PRIORITY_STYLE = {
  high: "text-rose-500",
  medium: "text-amber-500",
  low: "text-slate-400",
};

/**
 * Kanban board. Cards can be dragged between columns (desktop) or moved with the
 * status menu on each card (touch/keyboard). Moves are applied optimistically.
 */
export function TaskBoard({
  tasks,
  moveTask,
  showProject = true,
  showOrganization = false,
}: {
  tasks: BoardTask[];
  moveTask: (taskId: string, status: TaskStatus) => Promise<FormState>;
  showProject?: boolean;
  showOrganization?: boolean;
}) {
  const [optimisticTasks, applyMove] = useOptimistic(tasks, (state, move: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === move.id ? { ...t, status: move.status } : t)),
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(id: string, status: TaskStatus) {
    const task = optimisticTasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id, status });
      const result = await moveTask(id, status);
      if (result?.error) setError(result.error);
      // Safety net: always converge on the server's state, even if the action's own
      // refresh was dropped (e.g. the move happened while the page was still hydrating).
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {TASK_COLUMNS.map((column) => {
          const columnTasks = optimisticTasks.filter((t) => t.status === column.status);
          return (
            <section
              key={column.status}
              aria-label={column.label}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(column.status);
              }}
              onDragLeave={() => setDragOver((s) => (s === column.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                move(e.dataTransfer.getData("text/plain"), column.status);
              }}
              className={cn(
                "flex w-72 shrink-0 snap-start flex-col rounded-xl border border-border bg-muted/60 p-2 transition-colors sm:w-auto",
                dragOver === column.status && "border-primary bg-primary-soft",
              )}
            >
              <header className="flex items-center gap-2 px-2 py-1.5">
                <span className={cn("size-2 rounded-full", column.dot)} />
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{columnTasks.length}</span>
              </header>
              <div className="flex min-h-24 flex-1 flex-col gap-2">
                {columnTasks.map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group cursor-grab rounded-lg border border-border bg-card p-3 shadow-xs active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <Flag className={cn("mt-0.5 size-3.5 shrink-0", PRIORITY_STYLE[task.priority])} aria-label={`${task.priority} priority`} />
                      <Link
                        href={`/workspace/${task.organization.slug}/tasks/${task.id}`}
                        className={cn(
                          "text-sm leading-snug font-medium hover:underline",
                          task.status === "done" && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </Link>
                    </div>
                    {(showProject && task.project) || showOrganization ? (
                      <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <FolderKanban className="size-3 shrink-0" />
                        {showOrganization ? task.organization.name : null}
                        {showOrganization && task.project ? " · " : null}
                        {task.project?.title}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      {task.dueLabel && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs",
                            task.overdue ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          <CalendarDays className="size-3" /> {task.dueLabel}
                        </span>
                      )}
                      <select
                        value={task.status}
                        onChange={(e) => move(task.id, e.target.value as TaskStatus)}
                        aria-label="Move task"
                        className="ml-auto h-6 rounded border border-transparent bg-transparent text-xs text-muted-foreground hover:border-border focus:border-border"
                      >
                        {TASK_COLUMNS.map((c) => (
                          <option key={c.status} value={c.status}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {task.assignee ? (
                        <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} seed={task.assignee.id} size="xs" />
                      ) : (
                        <span className="size-6 rounded-full border border-dashed border-border" title="Unassigned" />
                      )}
                    </div>
                  </article>
                ))}
                {columnTasks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Drop tasks here
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
