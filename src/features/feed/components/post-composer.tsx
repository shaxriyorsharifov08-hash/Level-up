"use client";

import { Megaphone } from "lucide-react";
import { FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

export function PostComposer({
  action,
  orgName,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  orgName: string;
}) {
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <FormMessage state={state?.ok ? null : state} />
      <Textarea
        name="content"
        rows={3}
        maxLength={3000}
        required
        placeholder={`Share an update from ${orgName} with members and followers…`}
        aria-label="Update"
      />
      {state?.fieldErrors?.content && <p className="text-xs text-destructive">{state.fieldErrors.content[0]}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Shown on your public page and in followers&apos; feeds.</p>
        <SubmitButton pending={pending} size="sm" pendingText="Posting…">
          <Megaphone /> Post update
        </SubmitButton>
      </div>
    </form>
  );
}
