"use client";

import { useState } from "react";
import { Checkbox, Field, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ShopItemKind } from "@/db/schema";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";
import { KIND_LABEL } from "../constants";

type ItemValues = {
  name: string;
  description: string;
  imageUrl: string | null;
  kind: ShopItemKind;
  priceTokens: number;
  stock: number | null;
  discountPercent: number | null;
  partnerName: string | null;
  active: boolean;
};

const KIND_HINT: Record<ShopItemKind, string> = {
  merch: "A physical item students collect with their code (hoodies, notebooks, stickers…).",
  partner_voucher: "A discount at a partner business (café, cinema, print shop…). Staff there check the code.",
  ticket_voucher: "A discount students apply themselves when registering for a paid event on this platform.",
};

/** Create or edit a shop item. Fields that only apply to vouchers appear when a voucher kind is picked. */
export function ShopItemForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values?: ItemValues;
  submitLabel: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const [kind, setKind] = useState<ShopItemKind>(values?.kind ?? "merch");
  const e = state?.fieldErrors;

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={e?.name}>
          <Input id="name" name="name" required maxLength={80} defaultValue={values?.name} placeholder="Campus hoodie" />
        </Field>
        <Field label="Type" htmlFor="kind" hint={KIND_HINT[kind]} error={e?.kind}>
          <Select id="kind" name="kind" value={kind} onChange={(ev) => setKind(ev.target.value as ShopItemKind)}>
            {(Object.keys(KIND_LABEL) as ShopItemKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price (tokens)" htmlFor="priceTokens" error={e?.priceTokens}>
          <Input id="priceTokens" name="priceTokens" type="number" min={1} required defaultValue={values?.priceTokens ?? ""} />
        </Field>
        <Field label="Stock" htmlFor="stock" hint="How many can be bought. Leave empty for unlimited." error={e?.stock}>
          <Input id="stock" name="stock" type="number" min={0} defaultValue={values?.stock ?? ""} />
        </Field>
        {kind !== "merch" && (
          <Field label="Discount (%)" htmlFor="discountPercent" hint="For example 25 or 50." error={e?.discountPercent}>
            <Input
              id="discountPercent"
              name="discountPercent"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={values?.discountPercent ?? 25}
            />
          </Field>
        )}
        {kind === "partner_voucher" && (
          <Field label="Partner" htmlFor="partnerName" hint="Where the voucher is accepted" error={e?.partnerName}>
            <Input id="partnerName" name="partnerName" required maxLength={80} defaultValue={values?.partnerName ?? ""} placeholder="Campus Café" />
          </Field>
        )}
        <Field label="Image URL" htmlFor="imageUrl" error={e?.imageUrl} className="sm:col-span-2">
          <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" defaultValue={values?.imageUrl ?? ""} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={e?.description}>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={values?.description}
          placeholder="Sizes, conditions, where to collect it, expiry…"
        />
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox id="active" name="active" defaultChecked={values?.active ?? true} />
        <Label htmlFor="active">Visible in the shop</Label>
      </div>
      <div>
        <SubmitButton pending={pending} pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
