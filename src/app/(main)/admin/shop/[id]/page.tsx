import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveShopItem } from "@/features/rewards/actions";
import { ShopItemForm } from "@/features/rewards/components/shop-item-form";
import { getShopItem } from "@/features/rewards/queries";
import { requirePlatformAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit shop item" };

export default async function EditShopItemPage({ params }: PageProps<"/admin/shop/[id]">) {
  const { id } = await params;
  await requirePlatformAdmin(`/admin/shop/${id}`);
  const item = await getShopItem(id);
  if (!item) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-text hover:underline">
        <ArrowLeft className="size-4" /> All items
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit {item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ShopItemForm action={saveShopItem.bind(null, item.id)} submitLabel="Save changes" values={item} />
          <p className="mt-4 text-xs text-muted-foreground">
            Changes apply to new purchases. Codes students already bought keep the price and discount they paid for.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
