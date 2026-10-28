import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/misc";
import { getWorkspace } from "@/features/organizations/queries";
import { ProjectCard } from "@/features/projects/components/project-card";
import { listOrgProjects } from "@/features/projects/queries";

export const metadata: Metadata = { title: "Projects" };

export default async function WorkspaceProjectsPage({ params }: PageProps<"/workspace/[slug]/projects">) {
  const { slug } = await params;
  const { org, access } = await getWorkspace(slug);
  const projects = await listOrgProjects(org.id, { includePrivate: true });

  return (
    <div>
      <SectionHeader
        title="Projects"
        action={
          access.canManage && (
            <Link href={`/workspace/${org.slug}/projects/new`} className={buttonVariants({ size: "sm" })}>
              <Plus /> New project
            </Link>
          )
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Projects group tasks so your team can track progress toward a goal."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} href={`/workspace/${org.slug}/projects/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
