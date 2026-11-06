import type { Metadata } from "next";
import { CheckCircle2, ReceiptText, Undo2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { buildHref, FilterPills, SearchForm } from "@/components/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { OrderStatus } from "@/db/schema";
import { redeemOrder, refundOrder } from "@/features/rewards/actions";
import { KIND_ICON, TokenAmount } from "@/features/rewards/components/shop";
import { listOrders } from "@/features/rewards/queries";
import { requirePlatformAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { oneOf, param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Orders & codes" };

const STATUS: Record<OrderStatus, { label: string; variant: "success" | "default" | "outline" }> = {
  active: { label: "Not used yet", variant: "success" },
  used: { label: "Used", variant: "default" },
  cancelled: { label: "Refunded", variant: "outline" },
};

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requirePlatformAdmin("/admin/orders");
  const sp = await searchParams;
  const q = param(sp.q);
  const status = oneOf(param(sp.status), ["active", "used", "cancelled"] as const);
  const orders = await listOrders({ q, status });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A student shows a code to collect merch: find it here and mark it as used. Partner vouchers are checked by the
        partner; event ticket vouchers are applied by students themselves when they register.
      </p>
      <SearchForm action="/admin/orders" q={q} placeholder="Code, item, student name or e-mail…" hidden={{ status }} />
      <FilterPills
        active={status ?? "all"}
        options={[
          { value: "all", label: "All", href: buildHref("/admin/orders", { q }) },
          ...(Object.keys(STATUS) as OrderStatus[]).map((s) => ({
            value: s,
            label: STATUS[s].label,
            href: buildHref("/admin/orders", { q, status: s }),
          })),
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={q ? "No orders match" : "No orders yet"}
          description={q ? "Check the code and try again. Codes look like ABCD-2345." : "Orders appear here when students buy from the shop."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {orders.map(({ order, user }) => {
                const Icon = KIND_ICON[order.kind];
                return (
                  <li key={order.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text sm:flex">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold tracking-wider">{order.code}</span>
                        <Badge variant={STATUS[order.status].variant}>{STATUS[order.status].label}</Badge>
                      </div>
                      <p className="truncate text-sm font-medium">
                        {order.itemName}
                        {order.partnerName && <span className="font-normal text-muted-foreground"> · {order.partnerName}</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.name} · {user.email} · bought {formatDateTime(order.createdAt)}
                        {order.usedAt && ` · used ${formatDateTime(order.usedAt)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TokenAmount amount={order.priceTokens} className="mr-2 text-sm" />
                      {order.status === "active" && order.kind !== "ticket_voucher" && (
                        <ActionButton action={redeemOrder.bind(null, order.id)} size="sm">
                          <CheckCircle2 /> Mark used
                        </ActionButton>
                      )}
                      {order.status === "active" && (
                        <ActionButton
                          action={refundOrder.bind(null, order.id)}
                          variant="ghost"
                          size="sm"
                          confirm={`Cancel ${order.code} and give ${user.name} their ${order.priceTokens} tokens back?`}
                        >
                          <Undo2 /> Refund
                        </ActionButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
