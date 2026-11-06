import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Store } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { setItemActive } from "@/features/rewards/actions";
import { KIND_LABEL } from "@/features/rewards/constants";
import { itemSummary, KIND_ICON, TokenAmount } from "@/features/rewards/components/shop";
import { listShopItems } from "@/features/rewards/queries";
import { requirePlatformAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop items" };

export default async function AdminShopPage() {
  await requirePlatformAdmin("/admin/shop");
  const items = await listShopItems({ includeInactive: true });

  return (
    <section>
      <SectionHeader
        title={`Shop items (${items.length})`}
        action={
          <Link href="/admin/shop/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> New item
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No items yet"
          description="Add merch, partner discounts or 25%/50% event ticket vouchers that students can buy with tokens."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                const soldOut = item.stock !== null && item.stock <= 0;
                return (
                  <li
                    key={item.id}
                    className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", !item.active && "opacity-60")}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
                        {!item.active && <Badge>Hidden</Badge>}
                        {soldOut && <Badge variant="danger">Sold out</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {itemSummary(item)} · {item.stock === null ? "unlimited" : `${item.stock} in stock`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TokenAmount amount={item.priceTokens} className="mr-2" />
                      <Link href={`/admin/shop/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <Pencil /> Edit
                      </Link>
                      <ActionButton action={setItemActive.bind(null, item.id, !item.active)} variant="ghost" size="sm">
                        {item.active ? (
                          <>
                            <EyeOff /> Hide
                          </>
                        ) : (
                          <>
                            <Eye /> Show
                          </>
                        )}
                      </ActionButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
