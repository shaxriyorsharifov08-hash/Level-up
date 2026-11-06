import { TabsNav } from "@/components/layout/tabs-nav";
import { PageHeader } from "@/components/ui/misc";
import { requirePlatformAdmin } from "@/lib/auth";

/** Platform administration: the rewards shop, redemption desk and token awards. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requirePlatformAdmin("/admin");
  return (
    <div className="space-y-6">
      <PageHeader title="Admin" description="Run the rewards shop, redeem codes and award tokens to students." />
      <TabsNav
        tabs={[
          { href: "/admin/shop", label: "Shop items" },
          { href: "/admin/orders", label: "Orders & codes" },
          { href: "/admin/tokens", label: "Award tokens" },
        ]}
      />
      {children}
    </div>
  );
}
