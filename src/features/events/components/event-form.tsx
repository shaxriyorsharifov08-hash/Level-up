"use client";

import { Checkbox, Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EVENT_CATEGORIES } from "@/config/site";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

type EventValues = {
  title: string;
  description: string;
  category: string;
  location: string;
  startsAt: string; // datetime-local values in the university time zone
  endsAt: string;
  capacity: number | null;
  coverUrl: string | null;
  status: "draft" | "published" | "cancelled";
  registrationOpen: boolean;
};

export function EventForm({
  action,
  values,
  submitLabel,
  timezone,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: EventValues;
  submitLabel: string;
  timezone: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const e = state?.fieldErrors;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormMessage state={state} />
      <Field label="Title" htmlFor="title" error={e?.title}>
        <Input id="title" name="title" required maxLength={120} defaultValue={values?.title} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor="startsAt" hint={`Time zone: ${timezone}`} error={e?.startsAt}>
          <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={values?.startsAt} />
        </Field>
        <Field label="Ends" htmlFor="endsAt" error={e?.endsAt}>
          <Input id="endsAt" name="endsAt" type="datetime-local" required defaultValue={values?.endsAt} />
        </Field>
        <Field label="Location" htmlFor="location" hint="Room, building or online link" error={e?.location}>
          <Input id="location" name="location" required maxLength={200} defaultValue={values?.location} />
        </Field>
        <Field label="Category" htmlFor="category" error={e?.category}>
          <Select id="category" name="category" defaultValue={values?.category ?? "General"}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity" htmlFor="capacity" hint="Leave empty for unlimited seats" error={e?.capacity}>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={values?.capacity ?? ""} />
        </Field>
        <Field label="Cover image URL" htmlFor="coverUrl" error={e?.coverUrl}>
          <Input id="coverUrl" name="coverUrl" type="url" placeholder="https://…" defaultValue={values?.coverUrl ?? ""} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={e?.description}>
        <Textarea
          id="description"
          name="description"
          rows={6}
          maxLength={10000}
          defaultValue={values?.description}
          placeholder="Agenda, speakers, what to bring…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {values?.status !== "cancelled" ? (
          <Field label="Visibility" htmlFor="status" error={e?.status}>
            <Select id="status" name="status" defaultValue={values?.status ?? "published"}>
              <option value="published">Published: visible to everyone</option>
              <option value="draft">Draft: only organizers can see it</option>
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="status" value="published" />
        )}
        <div className="flex items-center gap-2 sm:pt-7">
          <Checkbox id="registrationOpen" name="registrationOpen" defaultChecked={values?.registrationOpen ?? true} />
          <Label htmlFor="registrationOpen">Registration open</Label>
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
