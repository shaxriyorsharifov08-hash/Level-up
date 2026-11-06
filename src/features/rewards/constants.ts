import type { ShopItemKind, TaskPriority } from "@/db/schema";

// Shared by server and client components, so this file must not be a "use client" module.

/** Tokens for completing a task someone else assigned to you (official organizations only). */
export const TASK_REWARDS: Record<TaskPriority, number> = { low: 2, medium: 5, high: 10 };

export const DEFAULT_EVENT_REWARD = 10;
export const MAX_EVENT_REWARD = 100;

/** Largest single manual award (or deduction) an administrator can make. */
export const MAX_AWARD = 10_000;

export const KIND_LABEL: Record<ShopItemKind, string> = {
  merch: "Merch",
  partner_voucher: "Partner discount",
  ticket_voucher: "Event ticket discount",
};
