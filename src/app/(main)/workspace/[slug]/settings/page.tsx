import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteOrganization, updateOrganization } from "@/features/organizations/actions";
import { OrgForm } from "@/features/organizations/components/org-form";
import { getWorkspace } from "@/features/organizations/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function WorkspaceSettingsPage({ params }: PageProps<"/workspace/[slug]/settings">) {
  const { slug } = await params;
  const { org, access } = await getWorkspace(slug, { manage: true });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>How {org.name} appears to students.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <OrgForm action={updateOrganization.bind(null, org.id)} organization={org} submitLabel="Save changes" />
        </CardContent>
      </Card>

      {(access.isOwner || access.managesFromOutside) && (
        <Card className="border-destructive/40">
          <CardHeader>
            <div>
              <CardTitle className="text-destructive">Delete {org.kind === "club" ? "club" : "organization"}</CardTitle>
              <CardDescription>
                Permanently deletes events, projects, tasks, meetings and chats. This can&apos;t be undone.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActionButton
              action={deleteOrganization.bind(null, org.id)}
              variant="danger"
              confirm={`Delete ${org.name} and all of its data? This cannot be undone.`}
            >
              <Trash2 /> Delete
            </ActionButton>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
