import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveShopItem } from "@/features/rewards/actions";
import { ShopItemForm } from "@/features/rewards/components/shop-item-form";
import { requirePlatformAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "New shop item" };

export default async function NewShopItemPage() {
  await requirePlatformAdmin("/admin/shop/new");
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>New shop item</CardTitle>
      </CardHeader>
      <CardContent>
        <ShopItemForm action={saveShopItem.bind(null, null)} submitLabel="Add to shop" />
      </CardContent>
    </Card>
  );
}
