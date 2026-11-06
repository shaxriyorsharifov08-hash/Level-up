"use client";

import { Users } from "lucide-react";
import { FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { createGroupConversation } from "../actions";

/**
 * Group creation form. People are picked with checkboxes rendered elsewhere on the page
 * that point at this form through the HTML `form="new-group"` attribute.
 */
export function GroupForm() {
  const { state, pending, onSubmit } = useActionForm(createGroupConversation);
  return (
    <form id="new-group" onSubmit={onSubmit} className="grid gap-3">
      <FormMessage state={state} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="name" placeholder="Group name, e.g. Hackathon team" aria-label="Group name" required maxLength={80} />
        <SubmitButton pending={pending} variant="outline" className="shrink-0">
          <Users /> Create group
        </SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">Tick the people below to add them to the group.</p>
    </form>
  );
}
