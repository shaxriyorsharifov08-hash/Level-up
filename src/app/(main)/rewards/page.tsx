import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, GraduationCap, ListChecks, ShoppingBag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionHeader } from "@/components/ui/misc";
import { DEFAULT_EVENT_REWARD, KIND_LABEL, TASK_REWARDS } from "@/features/rewards/constants";
import { CopyCode } from "@/features/rewards/components/copy-code";
import { howToUse, KIND_ICON, ShopItemCard } from "@/features/rewards/components/shop";
import { getWallet, listShopItems } from "@/features/rewards/queries";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rewards" };

const ORDER_STATUS = {
  active: { label: "Ready to use", variant: "success" },
  used: { label: "Used", variant: "default" },
  cancelled: { label: "Refunded", variant: "outline" },
} as const;

export default async function RewardsPage() {
  const user = await requireUser("/rewards");
  const [{ balance, history, orders, earnedRecently }, items] = await Promise.all([getWallet(user.id), listShopItems()]);
  const activeOrders = orders.filter((o) => o.status === "active");

  return (
    <div className="space-y-8">
      <PageHeader title="Rewards" description="Earn tokens by taking part in campus life, then spend them in the shop." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white shadow-sm">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_80%_20%,white_0,transparent_45%)]" />
          <div className="relative">
            <p className="text-sm font-medium text-white/85">Your balance</p>
            <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums">{balance.toLocaleString("en-US")}</p>
            <p className="text-sm text-white/85">tokens</p>
            <p className="mt-4 text-sm text-white/90">
              {earnedRecently > 0 ? `+${earnedRecently} earned in your recent activity` : "Attend an event to earn your first tokens"}
            </p>
          </div>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How to earn tokens</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="flex gap-3">
              <CalendarCheck2 className="mt-0.5 size-5 shrink-0 text-primary-text" />
              <div>
                <p className="text-sm font-medium">Attend events</p>
                <p className="text-sm text-muted-foreground">
                  Usually +{DEFAULT_EVENT_REWARD} per event of an official club, paid when you&apos;re checked in. Some events give
                  bonus tokens.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ListChecks className="mt-0.5 size-5 shrink-0 text-primary-text" />
              <div>
                <p className="text-sm font-medium">Finish team tasks</p>
                <p className="text-sm text-muted-foreground">
                  +{TASK_REWARDS.low} / +{TASK_REWARDS.medium} / +{TASK_REWARDS.high} by priority for tasks your team assigns you.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary-text" />
              <div>
                <p className="text-sm font-medium">Learn and achieve</p>
                <p className="text-sm text-muted-foreground">Good results, competitions and volunteering are awarded by the university.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionHeader title="Shop" />
        {items.length === 0 ? (
          <EmptyState icon={Store} title="The shop is empty for now" description="New rewards are added by the university. Keep earning!" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ShopItemCard key={item.id} item={item} balance={balance} />
            ))}
          </div>
        )}
      </section>

      <section id="my-rewards" className="scroll-mt-24">
        <SectionHeader
          title={`My rewards${activeOrders.length ? ` (${activeOrders.length} ready)` : ""}`}
        />
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Nothing bought yet" description="Things you buy appear here with a code to redeem them." />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const Icon = KIND_ICON[order.kind];
              const status = ORDER_STATUS[order.status];
              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center",
                    order.status !== "active" && "opacity-70",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{order.itemName}</p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.status === "active" ? howToUse(order) : KIND_LABEL[order.kind]} · bought {formatDate(order.createdAt)} for{" "}
                      {order.priceTokens} tokens
                    </p>
                  </div>
                  {order.status === "active" ? (
                    <CopyCode code={order.code} />
                  ) : (
                    <span className="font-mono text-sm text-muted-foreground line-through">{order.code}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeOrders.some((o) => o.kind === "ticket_voucher") && (
          <p className="mt-2 text-sm text-muted-foreground">
            Find a paid event on the{" "}
            <Link href="/events" className="font-medium text-primary-text hover:underline">
              events page
            </Link>{" "}
            to use your ticket voucher.
          </p>
        )}
      </section>

      <section>
        <SectionHeader title="Token history" />
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(t.createdAt)}</p>
                </div>
                <span className={cn("shrink-0 font-semibold tabular-nums", t.amount > 0 ? "text-success" : "text-destructive")}>
                  {t.amount > 0 ? `+${t.amount}` : t.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
