import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { buildHref, FilterPills, SearchForm } from "@/components/filter-bar";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ORG_CATEGORIES } from "@/config/site";
import { OrgCard } from "@/features/organizations/components/org-card";
import { listOrganizations } from "@/features/organizations/queries";
import { getCurrentUser } from "@/lib/auth";
import { oneOf, param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Clubs & organizations" };

export default async function ClubsPage({ searchParams }: PageProps<"/clubs">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const kind = oneOf(param(sp.kind), ["organization", "club"] as const);
  const category = oneOf(param(sp.category), ORG_CATEGORIES);

  const [user, orgs] = await Promise.all([getCurrentUser(), listOrganizations({ q, kind, category })]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs & organizations"
        description="Find your people: join a club, follow organizations and never miss what they do."
        actions={
          user && (
            <Link href="/clubs/new" className={buttonVariants()}>
              <Plus /> Create
            </Link>
          )
        }
      />
      <SearchForm action="/clubs" q={q} placeholder="Search clubs and organizations…" hidden={{ kind }}>
        <Select name="category" defaultValue={category ?? ""} aria-label="Category" className="sm:w-52">
          <option value="">All categories</option>
          {ORG_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </SearchForm>
      <FilterPills
        active={kind ?? "all"}
        options={[
          { value: "all", label: "All", href: buildHref("/clubs", { q, category }) },
          { value: "club", label: "Clubs", href: buildHref("/clubs", { q, category, kind: "club" }) },
          { value: "organization", label: "Organizations", href: buildHref("/clubs", { q, category, kind: "organization" }) },
        ]}
      />
      {orgs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nothing found"
          description={q || category || kind ? "Try a different search or filter." : "Be the first to create a club!"}
          action={
            user && (
              <Link href="/clubs/new" className={buttonVariants({ variant: "outline" })}>
                Create a club
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}
