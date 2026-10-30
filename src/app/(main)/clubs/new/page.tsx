import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { createOrganization } from "@/features/organizations/actions";
import { OrgForm } from "@/features/organizations/components/org-form";
import { getManageableParents } from "@/features/organizations/queries";
import { requireUser } from "@/lib/auth";
import { param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Create a club or organization" };

export default async function NewOrganizationPage({ searchParams }: PageProps<"/clubs/new">) {
  const user = await requireUser("/clubs/new");
  const parentSlug = param((await searchParams).parent);
  const parents = await getManageableParents(user);
  const defaultParent = parents.find((p) => p.slug === parentSlug);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create a club or organization"
        description="You'll become its owner and get a workspace for events, projects, tasks and chat."
      />
      <Card>
        <CardContent className="pt-5">
          <OrgForm
            action={createOrganization}
            parents={parents}
            defaultParentId={defaultParent?.id}
            submitLabel="Create"
          />
        </CardContent>
      </Card>
    </div>
  );
}
