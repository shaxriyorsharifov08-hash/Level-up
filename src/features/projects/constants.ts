import type { ProjectStatus, TaskStatus } from "@/db/schema";

// Shared by server and client components, so this file must not be a "use client" module.

export const TASK_COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: "todo", label: "To do", dot: "bg-slate-400" },
  { status: "in_progress", label: "In progress", dot: "bg-sky-500" },
  { status: "review", label: "Review", dot: "bg-amber-500" },
  { status: "done", label: "Done", dot: "bg-emerald-500" },
];

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; variant: "default" | "primary" | "warning" | "success" }> = {
  planning: { label: "Planning", variant: "default" },
  active: { label: "Active", variant: "primary" },
  on_hold: { label: "On hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};
