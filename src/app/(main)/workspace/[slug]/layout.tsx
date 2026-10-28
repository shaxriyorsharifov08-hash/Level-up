import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TabsNav, type TabItem } from "@/components/layout/tabs-nav";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getPendingRequests, getWorkspace } from "@/features/organizations/queries";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/workspace/[slug]">) {
  const { slug } = await params;
  const { org, access } = await getWorkspace(slug);
  const pending = access.canManage ? (await getPendingRequests(org.id)).length : 0;
  const base = `/workspace/${org.slug}`;

  const tabs: TabItem[] = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/events`, label: "Events" },
    { href: `${base}/projects`, label: "Projects" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/calendar`, label: "Calendar" },
    { href: `${base}/members`, label: "Members", count: pending },
  ];
  if (org.kind === "organization") tabs.push({ href: `${base}/clubs`, label: "Clubs" });
  if (access.canManage) tabs.push({ href: `${base}/settings`, label: "Settings" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={org.name} src={org.logoUrl} seed={org.id} size="lg" square />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Workspace</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">{org.name}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {access.role && <Badge variant="primary" className="capitalize">{access.role}</Badge>}
              {access.managesFromOutside && <Badge variant="warning">Managing as {org.parent ? `${org.parent.name} admin` : "platform admin"}</Badge>}
            </div>
          </div>
        </div>
        <Link
          href={`/clubs/${org.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-text hover:underline"
        >
          Public page <ExternalLink className="size-3.5" />
        </Link>
      </header>
      <TabsNav tabs={tabs} />
      {children}
    </div>
  );
}
