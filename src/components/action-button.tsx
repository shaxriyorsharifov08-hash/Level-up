"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "./ui/button";
import { SubmitButton } from "./ui/submit-button";

/**
 * A one-click button bound to a Server Action (join, follow, approve, delete...).
 * Shows a pending spinner, an optional confirmation prompt and any error returned.
 */
export function ActionButton({
  action,
  confirm,
  pendingText,
  children,
  className,
  formClassName,
  ...buttonProps
}: Omit<ButtonProps, "action"> & {
  action: () => Promise<FormState>;
  confirm?: string;
  pendingText?: string;
  formClassName?: string;
}) {
  const [state, formAction] = useActionState(async () => action(), null);
  return (
    <form
      action={formAction}
      className={cn("inline-flex flex-col items-start gap-1", formClassName)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <SubmitButton pendingText={pendingText} className={className} {...buttonProps}>
        {children}
      </SubmitButton>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
