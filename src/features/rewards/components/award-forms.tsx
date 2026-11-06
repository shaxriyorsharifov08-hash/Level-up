"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AwardForm({ action }: { action: Action }) {
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });
  const e = state?.fieldErrors;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Student e-mail" htmlFor="award-email" error={e?.email}>
          <Input id="award-email" name="email" type="email" required placeholder="student@demo.edu" />
        </Field>
        <Field label="Tokens" htmlFor="award-amount" error={e?.amount}>
          <Input id="award-amount" name="amount" type="number" required placeholder="50" />
        </Field>
      </div>
      <Field label="Reason" htmlFor="award-reason" hint="Shown in the student's token history. Use a negative number to correct a mistake." error={e?.reason}>
        <Input id="award-reason" name="reason" required maxLength={200} placeholder="Dean's list, autumn semester" />
      </Field>
      <div>
        <SubmitButton pending={pending} pendingText="Awarding…">
          Award tokens
        </SubmitButton>
      </div>
    </form>
  );
}

const EXAMPLE = `email,tokens,reason
laylo@demo.edu,100,Top grade in Linear Algebra
ethan@demo.edu,50,Hackathon finalist`;

/** Paste or upload a CSV of awards; the file is read in the browser and sent as text. */
export function BulkAwardForm({ action }: { action: Action }) {
  const { state, pending, onSubmit, formRef } = useActionForm(action, { resetOnSuccess: true });
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !textRef.current) return;
    if (file.size > 500_000) {
      setReadError("The file is too large (max 500 KB).");
      return;
    }
    setReadError(null);
    textRef.current.value = await file.text();
    setFileName(file.name);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      <FormMessage state={state} />
      {readError && <p className="text-sm text-destructive">{readError}</p>}
      <Field
        label="2. Upload or paste the filled-in file"
        htmlFor="csv"
        hint="Columns: email, tokens, reason (other columns are ignored, rows without tokens are skipped). Commas, semicolons or tabs all work, so you can paste straight from Excel or Google Sheets."
      >
        <Textarea
          id="csv"
          name="csv"
          ref={textRef}
          rows={8}
          required
          className="font-mono text-xs"
          placeholder={EXAMPLE}
          onChange={() => setFileName(null)}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent">
          <FileUp className="size-4" /> Load a .csv file
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={onFile} />
        </label>
        {fileName && <span className="text-sm text-muted-foreground">Loaded {fileName}</span>}
        <SubmitButton pending={pending} pendingText="Awarding…" className="ml-auto">
          Award to everyone in the file
        </SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        All rows are checked first: if any row is wrong (unknown e-mail, bad number), nothing is awarded and you see which lines to fix.
      </p>
    </form>
  );
}
