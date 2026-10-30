"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Submit a form to a Server Action without React's automatic form reset, so users keep
 * what they typed when validation fails. Optionally resets the form after success.
 */
export function useActionForm(action: Action, options: { resetOnSuccess?: boolean } = {}) {
  const [state, dispatch, actionPending] = useActionState(action, null);
  const [transitionPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { resetOnSuccess } = options;

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return { state, pending: actionPending || transitionPending, onSubmit, formRef };
}
