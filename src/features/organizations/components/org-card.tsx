import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cover } from "@/components/ui/misc";
import type { OrganizationListItem } from "../queries";

export function OrgCard({ org }: { org: OrganizationListItem }) {
  return (
    <Link
      href={`/clubs/${org.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <Cover src={org.coverUrl} seed={org.id} className="h-20" />
      <div className="flex flex-1 flex-col p-4 pt-0">
        <Avatar
          name={org.name}
          src={org.logoUrl}
          seed={org.id}
          size="lg"
          square
          className="relative -mt-7 ring-4 ring-card"
        />
        <div className="mt-2 flex items-center gap-1.5">
          <h3 className="truncate font-semibold group-hover:text-primary-text">{org.name}</h3>
          {org.verified && <BadgeCheck className="size-4 shrink-0 text-primary-text" aria-label="Verified" />}
        </div>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {org.tagline || org.description || "No description yet."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={org.kind === "organization" ? "primary" : "default"}>
            {org.kind === "organization" ? "Organization" : "Club"}
          </Badge>
          <span className="truncate">{org.category}</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Users className="size-3.5" /> {org.members}
          </span>
        </div>
      </div>
    </Link>
  );
}
