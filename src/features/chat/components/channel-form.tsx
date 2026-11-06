"use client";

import { Hash } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

export function ChannelForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const { state, pending, onSubmit } = useActionForm(action);
  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Field error={state?.fieldErrors?.name} className="flex-1">
          <Input name="name" placeholder="e.g. design-team" aria-label="Channel name" required maxLength={40} />
        </Field>
        <SubmitButton pending={pending} variant="outline">
          <Hash /> Create
        </SubmitButton>
      </div>
    </form>
  );
}
