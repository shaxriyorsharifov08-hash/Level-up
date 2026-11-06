import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspace } from "@/features/organizations/queries";
import { createProject } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/project-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ params }: PageProps<"/workspace/[slug]/projects/new">) {
  const { slug } = await params;
  const { org } = await getWorkspace(slug, { manage: true });
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>New project</CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectForm action={createProject.bind(null, org.id)} submitLabel="Create project" />
      </CardContent>
    </Card>
  );
}
