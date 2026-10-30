"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";

/**
 * Submit button that disables itself and shows a spinner while submitting.
 * Pass `pending` when the form is driven by `useActionForm`; otherwise the
 * status of the enclosing `<form action>` is used.
 */
export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  disabled,
  ...props
}: ButtonProps & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
