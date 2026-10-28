"use client";

import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";
import type { OrgRole } from "@/lib/permissions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const ROLE_LABEL: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };

/** Inline editor for a member's role and responsibility. */
export function MemberEditForm({
  action,
  role,
  responsibility,
  roles,
}: {
  action: Action;
  role: OrgRole;
  responsibility: string | null;
  roles: OrgRole[];
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const options = roles.includes(role) ? roles : [role, ...roles];
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="responsibility"
        defaultValue={responsibility ?? ""}
        placeholder="Responsibility, e.g. Head of PR"
        aria-label="Responsibility"
        className="h-9 w-full sm:w-56"
        maxLength={80}
      />
      <Select name="role" defaultValue={role} aria-label="Role" className="h-9 w-32">
        {options.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </Select>
      <SubmitButton pending={pending} size="sm" variant="outline">
        Save
      </SubmitButton>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state?.ok && <span className="text-xs text-success">Saved</span>}
    </form>
  );
}

export function AddMemberForm({ action }: { action: Action }) {
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-start">
        <Field error={state?.fieldErrors?.email}>
          <Input name="email" type="email" placeholder="student@university.edu" aria-label="E-mail" required />
        </Field>
        <Input name="responsibility" placeholder="Responsibility (optional)" aria-label="Responsibility" maxLength={80} />
        <Select name="role" defaultValue="member" aria-label="Role" className="sm:w-32">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
        <SubmitButton pending={pending}>Add</SubmitButton>
      </div>
    </form>
  );
}
