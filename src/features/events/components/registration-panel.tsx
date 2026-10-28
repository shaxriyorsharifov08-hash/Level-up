"use client";

import { useActionState } from "react";
import { CheckCircle2, Clock, Ticket, XCircle } from "lucide-react";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RegistrationStatus } from "@/db/schema";
import type { FormState } from "@/lib/forms";

/** Register / cancel controls on the event page. The current status comes from the server. */
export function RegistrationPanel({
  status,
  blocker,
  full,
  register,
  cancel,
}: {
  status: RegistrationStatus | undefined;
  blocker: string | null;
  full: boolean;
  register: () => Promise<FormState>;
  cancel: () => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(
    async (_prev: FormState, formData: FormData) => (formData.get("intent") === "cancel" ? cancel() : register()),
    null,
  );

  return (
    <div className="space-y-3">
      {status === "registered" && (
        <p className="flex items-center gap-2 font-medium text-success">
          <CheckCircle2 className="size-5" /> You&apos;re going
        </p>
      )}
      {status === "waitlisted" && (
        <p className="flex items-center gap-2 font-medium text-warning">
          <Clock className="size-5" /> You&apos;re on the waitlist. We&apos;ll notify you if a spot opens up.
        </p>
      )}
      {state?.error && <FormMessage state={state} />}

      {status ? (
        <form
          action={formAction}
          onSubmit={(e) => {
            if (!window.confirm("Cancel your registration?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="intent" value="cancel" />
          <SubmitButton variant="outline" className="w-full" pendingText="Cancelling…">
            <XCircle /> {status === "waitlisted" ? "Leave waitlist" : "Cancel registration"}
          </SubmitButton>
        </form>
      ) : blocker ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{blocker}</p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="intent" value="register" />
          <SubmitButton size="lg" className="w-full" pendingText="Registering…">
            <Ticket /> {full ? "Join waitlist" : "Register"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
