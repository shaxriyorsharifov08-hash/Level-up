"use client";

import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { changePassword, updateProfile } from "../actions";

type Profile = {
  name: string;
  email: string;
  faculty: string | null;
  studyYear: number | null;
  bio: string | null;
  avatarUrl: string | null;
  telegram: string | null;
  instagram: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const { state, pending, onSubmit } = useActionForm(updateProfile);
  const errors = state?.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors?.name}>
          <Input id="name" name="name" defaultValue={profile.name} required />
        </Field>
        <Field label="E-mail" htmlFor="email" hint="Contact an administrator to change your e-mail.">
          <Input id="email" value={profile.email} disabled readOnly />
        </Field>
        <Field label="Faculty" htmlFor="faculty" error={errors?.faculty}>
          <Input id="faculty" name="faculty" defaultValue={profile.faculty ?? ""} />
        </Field>
        <Field label="Year of study" htmlFor="studyYear" error={errors?.studyYear}>
          <Select id="studyYear" name="studyYear" defaultValue={profile.studyYear?.toString() ?? ""}>
            <option value="">Prefer not to say</option>
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="About you" htmlFor="bio" hint="Interests, skills, what you're looking for…" error={errors?.bio}>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
      </Field>
      <Field label="Avatar image URL" htmlFor="avatarUrl" error={errors?.avatarUrl}>
        <Input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://…" defaultValue={profile.avatarUrl ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telegram username" htmlFor="telegram" error={errors?.telegram}>
          <Input id="telegram" name="telegram" placeholder="@username" defaultValue={profile.telegram ?? ""} />
        </Field>
        <Field label="Instagram username" htmlFor="instagram" error={errors?.instagram}>
          <Input id="instagram" name="instagram" placeholder="@username" defaultValue={profile.instagram ?? ""} />
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { state, pending, onSubmit, formRef } = useActionForm(changePassword, { resetOnSuccess: true });
  const errors = state?.fieldErrors;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="Current password" htmlFor="currentPassword" error={errors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" error={errors?.newPassword}>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors?.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending} variant="outline" pendingText="Updating…">
          Update password
        </SubmitButton>
      </div>
    </form>
  );
}
