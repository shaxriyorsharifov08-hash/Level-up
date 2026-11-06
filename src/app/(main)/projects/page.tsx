import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { buildHref, FilterPills, SearchForm } from "@/components/filter-bar";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ProjectCard } from "@/features/projects/components/project-card";
import { listPublicProjects } from "@/features/projects/queries";
import { oneOf, param } from "@/lib/search-params";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const q = param(sp.q);
  const filter = oneOf(param(sp.filter), ["contributors", "active", "completed"] as const);
  const projects = await listPublicProjects({
    q,
    contributors: filter === "contributors",
    status: filter === "active" || filter === "completed" ? filter : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="See what student teams are building, and find one to contribute to." />
      <SearchForm action="/projects" q={q} placeholder="Search projects or organizations…" hidden={{ filter }} />
      <FilterPills
        active={filter ?? "all"}
        options={[
          { value: "all", label: "All", href: buildHref("/projects", { q }) },
          { value: "contributors", label: "Looking for contributors", href: buildHref("/projects", { q, filter: "contributors" }) },
          { value: "active", label: "Active", href: buildHref("/projects", { q, filter: "active" }) },
          { value: "completed", label: "Completed", href: buildHref("/projects", { q, filter: "completed" }) },
        ]}
      />
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description="Clubs share their public projects here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} href={`/projects/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
