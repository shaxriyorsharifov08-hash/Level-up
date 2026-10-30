"use client";

import { Checkbox, Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

type ProjectValues = {
  title: string;
  summary: string;
  description: string;
  status: string;
  isPublic: boolean;
  lookingForContributors: boolean;
  coverUrl: string | null;
  dueDate: string;
};

export function ProjectForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: ProjectValues;
  submitLabel: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const e = state?.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormMessage state={state} />
      <Field label="Title" htmlFor="title" error={e?.title}>
        <Input id="title" name="title" required maxLength={120} defaultValue={values?.title} />
      </Field>
      <Field label="Summary" htmlFor="summary" hint="One or two sentences shown on project cards." error={e?.summary}>
        <Input id="summary" name="summary" maxLength={200} defaultValue={values?.summary} />
      </Field>
      <Field label="Description" htmlFor="description" error={e?.description}>
        <Textarea
          id="description"
          name="description"
          rows={6}
          maxLength={10000}
          defaultValue={values?.description}
          placeholder="Goals, scope, milestones, how students can help…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Status" htmlFor="status" error={e?.status}>
          <Select id="status" name="status" defaultValue={values?.status ?? "planning"}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label="Target date" htmlFor="dueDate" error={e?.dueDate}>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={values?.dueDate} />
        </Field>
        <Field label="Cover image URL" htmlFor="coverUrl" error={e?.coverUrl}>
          <Input id="coverUrl" name="coverUrl" type="url" placeholder="https://…" defaultValue={values?.coverUrl ?? ""} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="isPublic" name="isPublic" defaultChecked={values?.isPublic ?? true} />
          <Label htmlFor="isPublic">Show on the public projects page</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="lookingForContributors" name="lookingForContributors" defaultChecked={values?.lookingForContributors ?? false} />
          <Label htmlFor="lookingForContributors">Looking for contributors</Label>
        </div>
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
