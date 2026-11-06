"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { requireUser, safeRedirectPath } from "@/lib/auth";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { type FormState, invalid, optionalText, optionalUrl, parseForm, requiredText } from "@/lib/forms";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid e-mail address")).pipe(z.string().max(254));
const password = z.string().min(8, "Use at least 8 characters").max(200, "Password is too long");

const registerSchema = z.object({
  name: requiredText(80, "Name"),
  email,
  password,
  faculty: optionalText(120),
  next: z.string().optional(),
});

function emailDomainAllowed(address: string) {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;
  const domain = address.split("@")[1] ?? "";
  return domains.includes(domain);
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(registerSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password, faculty, next } = parsed.data;

  if (!emailDomainAllowed(email)) {
    return { fieldErrors: { email: ["Please use your university e-mail address"] }, error: "Sign-up is limited to university e-mail addresses." };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) return { fieldErrors: { email: ["An account with this e-mail already exists"] } };

  // Bootstrap: the very first account becomes the platform administrator.
  const [{ total }] = await db.select({ total: count() }).from(users);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      faculty,
      passwordHash: await hashPassword(password),
      role: total === 0 ? "admin" : "student",
    })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect(safeRedirectPath(next));
}

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().optional(),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, next } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, passwordHash: true },
  });
  // Always run a hash comparison so response time doesn't reveal whether the e-mail exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return { error: "Incorrect e-mail or password." };

  await createSession(user.id);
  redirect(safeRedirectPath(next));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: requiredText(80, "Name"),
  faculty: optionalText(120),
  studyYear: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 8), "Pick a valid year"),
  bio: optionalText(500),
  avatarUrl: optionalUrl,
  telegram: optionalText(64).transform((v) => (v ? v.replace(/^@/, "") : null)),
  instagram: optionalText(64).transform((v) => (v ? v.replace(/^@/, "") : null)),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(profileSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  await db.update(users).set(parsed.data).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(passwordSchema, formData);
  if (!parsed.success) return invalid(parsed.error);

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(users.id, user.id));
  // Sign out every other device, then start a fresh session here.
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await createSession(user.id);
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}
