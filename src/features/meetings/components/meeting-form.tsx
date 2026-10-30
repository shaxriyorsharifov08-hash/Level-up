"use client";

import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

export function MeetingForm({
  action,
  timezone,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  timezone: string;
}) {
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });
  const e = state?.fieldErrors;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="Title" htmlFor="m-title" error={e?.title}>
        <Input id="m-title" name="title" required maxLength={120} placeholder="Weekly sync" />
      </Field>
      <div className="grid gap-4">
        <Field label="Starts" htmlFor="m-startsAt" hint={timezone} error={e?.startsAt}>
          <Input id="m-startsAt" name="startsAt" type="datetime-local" required />
        </Field>
        <Field label="Ends" htmlFor="m-endsAt" error={e?.endsAt}>
          <Input id="m-endsAt" name="endsAt" type="datetime-local" required />
        </Field>
        <Field label="Location" htmlFor="m-location" error={e?.location}>
          <Input id="m-location" name="location" maxLength={200} placeholder="Room 101" />
        </Field>
        <Field label="Video call link" htmlFor="m-meetingUrl" error={e?.meetingUrl}>
          <Input id="m-meetingUrl" name="meetingUrl" type="url" placeholder="https://meet.google.com/…" />
        </Field>
      </div>
      <Field label="Agenda" htmlFor="m-description" error={e?.description}>
        <Textarea id="m-description" name="description" rows={3} maxLength={5000} />
      </Field>
      <div>
        <SubmitButton pending={pending} pendingText="Scheduling…">
          Schedule meeting
        </SubmitButton>
      </div>
    </form>
  );
}
