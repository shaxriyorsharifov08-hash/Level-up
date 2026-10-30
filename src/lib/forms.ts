/**
 * Shared helpers for Server Action forms: parsing FormData with Zod and a common
 * state shape consumed by `useActionState` on the client.
 */
import { z } from "zod";
import { parseLocalDateTime } from "./dates";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;

/** Turn FormData into a plain object (repeated keys become arrays) and validate it. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (key in raw) {
      const existing = raw[key];
      raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      raw[key] = value;
    }
  }
  return schema.safeParse(raw);
}

export function invalid(error: z.ZodError, message = "Please fix the highlighted fields."): FormState {
  return { error: message, fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}

/* ----------------------------- Reusable fields ---------------------------- */

export const requiredText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/** Optional text: empty strings become `null`. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .optional()
    .transform((v) => (v ? v : null));

/** Optional http(s) URL: empty strings become `null`. */
export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Enter a full link starting with https://")
  .transform((v) => (v ? v : null));

/** HTML checkbox: present ("on") means true. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

/** <input type="datetime-local"> in the university time zone → UTC Date. */
export const localDateTime = (label = "Date") =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform((v, ctx) => {
      const date = parseLocalDateTime(v);
      if (!date) {
        ctx.addIssue({ code: "custom", message: `${label} is invalid` });
        return z.NEVER;
      }
      return date;
    });

export const optionalLocalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? parseLocalDateTime(v) : null));

/** Optional positive integer from a number input; empty means `null`. */
export const optionalPositiveInt = (label = "Value") =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 100000) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number above 0` });
        return z.NEVER;
      }
      return n;
    });
