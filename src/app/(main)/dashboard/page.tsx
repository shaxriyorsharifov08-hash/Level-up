import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  return <PageHeader title={`Hi, ${user.name.split(" ")[0]} 👋`} description="Here's what's happening on campus." />;
}
