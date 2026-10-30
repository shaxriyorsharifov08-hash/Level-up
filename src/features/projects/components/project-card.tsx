import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Cover, Progress } from "@/components/ui/misc";
import type { ProjectStatus } from "@/db/schema";
import { PROJECT_STATUS } from "../constants";

type CardProject = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  coverUrl: string | null;
  isPublic: boolean;
  lookingForContributors: boolean;
  organization: { name: string };
  progress: { total: number; done: number; percent: number };
};

export function ProjectCard({ project, href }: { project: CardProject; href: string }) {
  const status = PROJECT_STATUS[project.status];
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <Cover src={project.coverUrl} seed={project.id} label={project.title} className="h-24" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium text-primary-text">{project.organization.name}</p>
        <h3 className="font-semibold group-hover:text-primary-text">{project.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{project.summary || "No summary yet."}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={status.variant}>{status.label}</Badge>
          {project.lookingForContributors && (
            <Badge variant="success">
              <Sparkles /> Looking for contributors
            </Badge>
          )}
          {!project.isPublic && <Badge variant="outline">Private</Badge>}
        </div>
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {project.progress.done}/{project.progress.total} tasks · {project.progress.percent}%
            </span>
          </div>
          <Progress value={project.progress.percent} />
        </div>
      </div>
    </Link>
  );
}
