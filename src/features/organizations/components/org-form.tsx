"use client";

import { useState } from "react";
import { Building2, Users } from "lucide-react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ORG_CATEGORIES } from "@/config/site";
import { useActionForm } from "@/hooks/use-action-form";
import type { Organization } from "@/db/schema";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function OrgForm({
  action,
  organization,
  parents = [],
  defaultParentId,
  submitLabel,
}: {
  action: Action;
  organization?: Organization;
  parents?: { id: string; name: string }[];
  defaultParentId?: string;
  submitLabel: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const [kind, setKind] = useState<"club" | "organization">(organization?.kind ?? "club");
  const e = state?.fieldErrors;
  const isEdit = !!organization;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormMessage state={state} />

      {!isEdit && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">What are you creating?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { value: "club", title: "Club", text: "Interest-based community students can join and follow.", icon: Users },
                {
                  value: "organization",
                  title: "Organization",
                  text: "Student union, council or society that runs projects and manages clubs.",
                  icon: Building2,
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                  kind === option.value ? "border-primary bg-primary-soft" : "border-border hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="sr-only"
                />
                <option.icon className="mt-0.5 size-5 shrink-0 text-primary-text" />
                <span>
                  <span className="block font-medium">{option.title}</span>
                  <span className="block text-sm text-muted-foreground">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!isEdit && kind === "club" && parents.length > 0 && (
        <Field
          label="Managed by"
          htmlFor="parentId"
          hint="Optional. Admins of the parent organization can help manage this club."
          error={e?.parentId}
        >
          <Select id="parentId" name="parentId" defaultValue={defaultParentId ?? ""}>
            <option value="">Independent club</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={e?.name}>
          <Input id="name" name="name" required maxLength={80} defaultValue={organization?.name} />
        </Field>
        <Field label="Category" htmlFor="category" error={e?.category}>
          <Select id="category" name="category" defaultValue={organization?.category ?? "General"}>
            {ORG_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Tagline" htmlFor="tagline" hint="One sentence shown on cards." error={e?.tagline}>
        <Input id="tagline" name="tagline" maxLength={140} defaultValue={organization?.tagline ?? ""} />
      </Field>
      <Field label="About" htmlFor="description" error={e?.description}>
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={5000}
          defaultValue={organization?.description}
          placeholder="What do you do? When do you meet? Who should join?"
        />
      </Field>
      <Field label="Who can join?" htmlFor="joinPolicy" error={e?.joinPolicy}>
        <Select id="joinPolicy" name="joinPolicy" defaultValue={organization?.joinPolicy ?? "open"}>
          <option value="open">Anyone can join instantly</option>
          <option value="request">Students request to join, admins approve</option>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telegram channel" htmlFor="telegramUrl" hint="@channel or https://t.me/…" error={e?.telegramUrl}>
          <Input id="telegramUrl" name="telegramUrl" defaultValue={organization?.telegramUrl ?? ""} />
        </Field>
        <Field label="Instagram" htmlFor="instagramUrl" hint="@account or full link" error={e?.instagramUrl}>
          <Input id="instagramUrl" name="instagramUrl" defaultValue={organization?.instagramUrl ?? ""} />
        </Field>
        <Field label="Website" htmlFor="websiteUrl" error={e?.websiteUrl}>
          <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://…" defaultValue={organization?.websiteUrl ?? ""} />
        </Field>
        <Field label="Logo image URL" htmlFor="logoUrl" error={e?.logoUrl}>
          <Input id="logoUrl" name="logoUrl" type="url" placeholder="https://…" defaultValue={organization?.logoUrl ?? ""} />
        </Field>
      </div>
      <Field label="Cover image URL" htmlFor="coverUrl" hint="Optional. A gradient is used when empty." error={e?.coverUrl}>
        <Input id="coverUrl" name="coverUrl" type="url" placeholder="https://…" defaultValue={organization?.coverUrl ?? ""} />
      </Field>

      <div>
        <SubmitButton pending={pending} pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
