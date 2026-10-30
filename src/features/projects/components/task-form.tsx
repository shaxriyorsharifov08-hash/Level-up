"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

type Option = { id: string; title?: string; name?: string };
type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

type TaskValues = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  projectId: string | null;
  eventId: string | null;
  dueDate: string; // "YYYY-MM-DD"
};

function TaskFields({
  values,
  members,
  projects,
  events,
  fixedProjectId,
  errors,
  compact,
}: {
  values?: TaskValues;
  members: Option[];
  projects: Option[];
  events: Option[];
  fixedProjectId?: string;
  errors?: Record<string, string[] | undefined>;
  compact?: boolean;
}) {
  return (
    <>
      <Field label="Title" htmlFor="title" error={errors?.title}>
        <Input id="title" name="title" required maxLength={200} defaultValue={values?.title} placeholder="What needs to be done?" />
      </Field>
      {!compact && (
        <Field label="Details" htmlFor="description" error={errors?.description}>
          <Textarea id="description" name="description" rows={4} defaultValue={values?.description} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Assignee" htmlFor="assigneeId" error={errors?.assigneeId}>
          <Select id="assigneeId" name="assigneeId" defaultValue={values?.assigneeId ?? ""}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date" htmlFor="dueDate" error={errors?.dueDate}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={values?.dueDate} />
        </Field>
        <Field label="Priority" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue={values?.priority ?? "medium"}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={values?.status ?? "todo"}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </Select>
        </Field>
      </div>
      {fixedProjectId ? (
        <input type="hidden" name="projectId" value={fixedProjectId} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" htmlFor="projectId" error={errors?.projectId}>
            <Select id="projectId" name="projectId" defaultValue={values?.projectId ?? ""}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Related event" htmlFor="eventId" error={errors?.eventId}>
            <Select id="eventId" name="eventId" defaultValue={values?.eventId ?? ""}>
              <option value="">None</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </>
  );
}

/** Collapsible "New task" form shown above boards. */
export function NewTaskForm({
  action,
  members,
  projects,
  events,
  fixedProjectId,
}: {
  action: Action;
  members: Option[];
  projects: Option[];
  events: Option[];
  fixedProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus /> New task
      </Button>
    );
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-border bg-card p-4">
      <FormMessage state={state} />
      <TaskFields
        members={members}
        projects={projects}
        events={events}
        fixedProjectId={fixedProjectId}
        errors={state?.fieldErrors}
        compact
      />
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingText="Adding…">
          Add task
        </SubmitButton>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}

export function EditTaskForm({
  action,
  values,
  members,
  projects,
  events,
}: {
  action: Action;
  values: TaskValues;
  members: Option[];
  projects: Option[];
  events: Option[];
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      <TaskFields values={values} members={members} projects={projects} events={events} errors={state?.fieldErrors} />
      <div>
        <SubmitButton pending={pending} pendingText="Saving…">
          Save task
        </SubmitButton>
      </div>
    </form>
  );
}
