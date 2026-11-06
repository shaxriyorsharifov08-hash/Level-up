import { Coins, PackageCheck, Percent, Ticket } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { Cover } from "@/components/ui/misc";
import type { ShopItem, ShopItemKind } from "@/db/schema";
import { cn } from "@/lib/utils";
import { buyItem } from "../actions";
import { KIND_LABEL } from "../constants";

export function TokenAmount({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", className)}>
      <Coins className="size-4 text-amber-500" aria-hidden />
      {amount.toLocaleString("en-US")}
      <span className="sr-only"> tokens</span>
    </span>
  );
}

export const KIND_ICON: Record<ShopItemKind, React.ComponentType<{ className?: string }>> = {
  merch: PackageCheck,
  partner_voucher: Percent,
  ticket_voucher: Ticket,
};

/** One line explaining what you get and how to use it. */
export function itemSummary(item: { kind: ShopItemKind; discountPercent: number | null; partnerName: string | null }) {
  if (item.kind === "ticket_voucher") return `${item.discountPercent}% off a paid event ticket on this platform`;
  if (item.kind === "partner_voucher") return `${item.discountPercent}% off at ${item.partnerName}`;
  return "Collect it with your code";
}

export function howToUse(order: { kind: ShopItemKind; partnerName: string | null }) {
  if (order.kind === "ticket_voucher") return "Choose this voucher when you register for a paid event.";
  if (order.kind === "partner_voucher") return `Show this code at ${order.partnerName} to get your discount.`;
  return "Show this code to the student office to collect your item.";
}

export function ShopItemCard({ item, balance }: { item: ShopItem; balance: number }) {
  const Icon = KIND_ICON[item.kind];
  const soldOut = item.stock !== null && item.stock <= 0;
  const missing = item.priceTokens - balance;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Cover src={item.imageUrl} seed={item.id} label={item.name} className="h-28">
        <Badge className="absolute top-3 left-3 bg-black/45 text-white backdrop-blur">
          <Icon /> {KIND_LABEL[item.kind]}
        </Badge>
        {item.discountPercent && (
          <span className="absolute right-3 bottom-3 rounded-lg bg-white/95 px-2 py-1 text-lg leading-none font-bold text-rose-600 shadow-sm">
            −{item.discountPercent}%
          </span>
        )}
      </Cover>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-xs font-medium text-primary-text">{itemSummary(item)}</p>
        {item.description && <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{item.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <TokenAmount amount={item.priceTokens} className="text-lg" />
            <p className="text-xs text-muted-foreground">
              {item.stock === null ? "Always available" : soldOut ? "Sold out" : `${item.stock} left`}
            </p>
          </div>
          <ActionButton
            action={buyItem.bind(null, item.id)}
            size="sm"
            disabled={soldOut || missing > 0}
            confirm={`Buy "${item.name}" for ${item.priceTokens} tokens?`}
            pendingText="Buying…"
            formClassName="items-end text-right"
            showSuccess
          >
            {soldOut ? "Sold out" : missing > 0 ? `Need ${missing} more` : "Buy"}
          </ActionButton>
        </div>
      </div>
    </article>
  );
}
