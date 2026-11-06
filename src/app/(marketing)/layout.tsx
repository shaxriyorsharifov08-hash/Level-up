import { PublicShell } from "@/components/layout/public-shell";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return <PublicShell bare>{children}</PublicShell>;
}
