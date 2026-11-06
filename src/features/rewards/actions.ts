"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { shopItems, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  checkbox,
  type FormState,
  invalid,
  optionalText,
  optionalUrl,
  optionalWholeNumber,
  parseForm,
  requiredText,
} from "@/lib/forms";
import { refreshAll } from "@/lib/revalidate";
import { MAX_AWARD } from "./constants";
import { parseAwardCsv } from "./csv";
import { awardTokens, cancelOrder, markOrderUsed, purchaseItem, RewardError } from "./service";

async function requireAdminAction() {
  const user = await requireUser();
  return user.role === "admin" ? user : null;
}

const NOT_ADMIN: FormState = { error: "Only platform administrators can do this." };

/* --------------------------------- Shop --------------------------------- */

export async function buyItem(itemId: string): Promise<FormState> {
  const user = await requireUser("/rewards");
  try {
    const order = await purchaseItem(user.id, itemId);
    refreshAll();
    return { ok: true, message: `Done! Your code for ${order.itemName} is ${order.code}.` };
  } catch (error) {
    if (error instanceof RewardError) return { error: error.message };
    throw error;
  }
}

/* ------------------------- Admin: items & orders ------------------------- */

const itemSchema = z
  .object({
    name: requiredText(80, "Name"),
    description: z.string().trim().max(1000, "Too long").default(""),
    imageUrl: optionalUrl,
    kind: z.enum(["merch", "partner_voucher", "ticket_voucher"]),
    priceTokens: optionalWholeNumber("Price", 1_000_000),
    stock: optionalWholeNumber("Stock", 1_000_000),
    discountPercent: optionalWholeNumber("Discount", 100),
    partnerName: optionalText(80),
    active: checkbox,
  })
  .superRefine((v, ctx) => {
    if (!v.priceTokens) ctx.addIssue({ path: ["priceTokens"], code: "custom", message: "Set a price of at least 1 token" });
    if (v.kind !== "merch" && !v.discountPercent) {
      ctx.addIssue({ path: ["discountPercent"], code: "custom", message: "Vouchers need a discount from 1 to 100%" });
    }
    if (v.kind === "partner_voucher" && !v.partnerName) {
      ctx.addIssue({ path: ["partnerName"], code: "custom", message: "Name the partner that honors this voucher" });
    }
  })
  .transform((v) => ({
    ...v,
    priceTokens: v.priceTokens ?? 1,
    discountPercent: v.kind === "merch" ? null : v.discountPercent,
    partnerName: v.kind === "partner_voucher" ? v.partnerName : null,
  }));

export async function saveShopItem(itemId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminAction();
  if (!admin) return NOT_ADMIN;
  const parsed = parseForm(itemSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  if (itemId) {
    await db.update(shopItems).set(parsed.data).where(eq(shopItems.id, itemId));
    refreshAll();
    return { ok: true, message: "Item saved." };
  }
  await db.insert(shopItems).values({ ...parsed.data, createdById: admin.id });
  refreshAll();
  redirect("/admin/shop");
}

export async function setItemActive(itemId: string, active: boolean): Promise<FormState> {
  if (!(await requireAdminAction())) return NOT_ADMIN;
  await db.update(shopItems).set({ active }).where(eq(shopItems.id, itemId));
  refreshAll();
  return { ok: true };
}

export async function redeemOrder(orderId: string): Promise<FormState> {
  if (!(await requireAdminAction())) return NOT_ADMIN;
  try {
    await markOrderUsed(orderId);
    refreshAll();
    return { ok: true };
  } catch (error) {
    if (error instanceof RewardError) return { error: error.message };
    throw error;
  }
}

export async function refundOrder(orderId: string): Promise<FormState> {
  const admin = await requireAdminAction();
  if (!admin) return NOT_ADMIN;
  try {
    await cancelOrder(orderId, admin.id);
    refreshAll();
    return { ok: true };
  } catch (error) {
    if (error instanceof RewardError) return { error: error.message };
    throw error;
  }
}

/* ----------------------------- Admin: awards ----------------------------- */

const awardSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid e-mail address")),
  amount: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Enter a whole number")
    .transform(Number)
    .refine((n) => n !== 0 && Math.abs(n) <= MAX_AWARD, `Between -${MAX_AWARD} and ${MAX_AWARD}, not 0`),
  reason: requiredText(200, "Reason"),
});

export async function awardToStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminAction();
  if (!admin) return NOT_ADMIN;
  const parsed = parseForm(awardSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const { email, amount, reason } = parsed.data;
  const student = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, name: true } });
  if (!student) return { fieldErrors: { email: ["No account with this e-mail"] } };

  await awardTokens([{ userId: student.id, amount, description: reason }], admin.id);
  refreshAll();
  return {
    ok: true,
    message: amount > 0 ? `${amount} tokens awarded to ${student.name}.` : `${-amount} tokens deducted from ${student.name}.`,
  };
}

/**
 * Award tokens to many students from a CSV (email,tokens,reason), e.g. one file per faculty
 * after exams. Nothing is written unless every row is valid.
 */
export async function bulkAward(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminAction();
  if (!admin) return NOT_ADMIN;
  const text = String(formData.get("csv") ?? "");
  if (text.length > 500_000) return { error: "The file is too large (max 500 KB)." };

  const { rows, errors, skipped } = parseAwardCsv(text);
  const emails = [...new Set(rows.map((r) => r.email))];
  const found = emails.length
    ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, emails))
    : [];
  const idByEmail = new Map(found.map((u) => [u.email, u.id]));
  for (const row of rows) {
    if (!idByEmail.has(row.email)) errors.push(`Line ${row.line}: no account with the e-mail ${row.email}.`);
  }
  if (errors.length > 0) {
    const shown = errors.slice(0, 10).join("\n");
    const more = errors.length > 10 ? `\n…and ${errors.length - 10} more.` : "";
    return { error: `Nothing was awarded. Fix these rows and try again:\n${shown}${more}` };
  }

  await awardTokens(
    rows.map((r) => ({ userId: idByEmail.get(r.email)!, amount: r.amount, description: r.reason })),
    admin.id,
  );
  refreshAll();
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const skippedNote = skipped ? ` ${skipped} rows without tokens were skipped.` : "";
  return {
    ok: true,
    message: `Done: ${rows.length} awards (${total} tokens in total) to ${emails.length} students.${skippedNote}`,
  };
}
