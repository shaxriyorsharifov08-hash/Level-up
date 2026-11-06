"use client";

import { useActionState } from "react";
import { CheckCircle2, Clock, Ticket, XCircle } from "lucide-react";
import { FormMessage, Label, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RegistrationStatus } from "@/db/schema";
import type { FormState } from "@/lib/forms";
import { discountedPrice, formatMoney } from "@/lib/money";

type Voucher = { id: string; itemName: string; discountPercent: number | null; code: string };

/** Register / cancel controls on the event page. The current status comes from the server. */
export function RegistrationPanel({
  status,
  blocker,
  full,
  ticketPrice,
  appliedDiscount,
  vouchers,
  register,
  cancel,
}: {
  status: RegistrationStatus | undefined;
  blocker: string | null;
  full: boolean;
  ticketPrice: number | null;
  /** Discount of the voucher used for the current registration, if any. */
  appliedDiscount: number | null;
  vouchers: Voucher[];
  register: (voucherOrderId: string | null) => Promise<FormState>;
  cancel: () => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(async (_prev: FormState, formData: FormData) => {
    if (formData.get("intent") === "cancel") return cancel();
    const voucher = String(formData.get("voucher") ?? "");
    return register(voucher || null);
  }, null);

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
      {status && ticketPrice !== null && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          You pay <strong>{formatMoney(discountedPrice(ticketPrice, appliedDiscount))}</strong> at the door
          {appliedDiscount ? ` (${appliedDiscount}% voucher applied)` : ""}.
        </p>
      )}
      {state?.error && <FormMessage state={state} />}

      {status ? (
        <form
          action={formAction}
          onSubmit={(e) => {
            const note = appliedDiscount ? " Your voucher will be returned to you." : "";
            if (!window.confirm(`Cancel your registration?${note}`)) e.preventDefault();
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
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="intent" value="register" />
          {ticketPrice !== null && vouchers.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="voucher">Use a ticket voucher</Label>
              <Select id="voucher" name="voucher" defaultValue={vouchers[0].id}>
                {vouchers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.discountPercent}% off · pay {formatMoney(discountedPrice(ticketPrice, v.discountPercent))} ({v.code})
                  </option>
                ))}
                <option value="">No voucher · pay {formatMoney(ticketPrice)}</option>
              </Select>
            </div>
          )}
          <SubmitButton size="lg" className="w-full" pendingText="Registering…">
            <Ticket /> {full ? "Join waitlist" : "Register"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
