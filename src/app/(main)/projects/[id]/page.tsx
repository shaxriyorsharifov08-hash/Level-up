import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FolderKanban, Sparkles } from "lucide-react";
import { SocialLinks } from "@/components/icons";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cover, Progress } from "@/components/ui/misc";
import { getOrgAccess } from "@/features/organizations/queries";
import { PROJECT_STATUS, TASK_COLUMNS } from "@/features/projects/constants";
import { getProject, getProjectProgress, listTasks } from "@/features/projects/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/dates";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const project = await getProject((await params).id);
  return { title: project?.isPublic ? project.title : "Project" };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const [user, project] = await Promise.all([getCurrentUser(), getProject(id)]);
  if (!project) notFound();
  const access = await getOrgAccess(user, project.organization.id, project.organization.parentId);
  if (!project.isPublic && !access.canView) notFound();

  const [progressMap, tasks] = await Promise.all([getProjectProgress([project.id]), listTasks({ projectId: project.id })]);
  const progress = progressMap.get(project.id)!;
  const contributors = [...new Map(tasks.flatMap((t) => (t.assignee ? [[t.assignee.id, t.assignee]] : []))).values()];
  const status = PROJECT_STATUS[project.status];

  return (
    <div className="space-y-6">
      <Cover src={project.coverUrl} seed={project.id} label={project.title} className="h-40 rounded-2xl sm:h-52" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/clubs/${project.organization.slug}`} className="text-sm font-medium text-primary-text hover:underline">
            {project.organization.name}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1>
          {project.summary && <p className="mt-2 max-w-2xl text-muted-foreground">{project.summary}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {!project.isPublic && <Badge variant="outline">Private</Badge>}
            {project.dueDate && (
              <Badge variant="outline">
                <CalendarDays /> Target {formatLongDate(project.dueDate)}
              </Badge>
            )}
          </div>
        </div>
        {access.canView && (
          <Link
            href={`/workspace/${project.organization.slug}/projects/${project.id}`}
            className={buttonVariants({ className: "shrink-0" })}
          >
            <FolderKanban /> Open board
          </Link>
        )}
      </div>

      {project.lookingForContributors && project.status !== "completed" && !access.isMember && (
        <Card className="border-success/40 bg-success-soft">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-success" />
              <div>
                <p className="font-medium">This team is looking for contributors</p>
                <p className="text-sm text-muted-foreground">
                  Join {project.organization.name} to get access to the board and start helping out.
                </p>
              </div>
            </div>
            <Link href={`/clubs/${project.organization.slug}`} className={buttonVariants({ variant: "outline", className: "shrink-0" })}>
              View {project.organization.name}
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About the project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {project.description || "No description yet."}
            </p>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <span className="text-sm font-semibold">{progress.percent}%</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress.percent} />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {TASK_COLUMNS.map((c) => (
                  <div key={c.status} className="rounded-lg bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{c.label}</dt>
                    <dd className="font-semibold">{tasks.filter((t) => t.status === c.status).length}</dd>
                  </div>
                ))}
              </dl>
              {contributors.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Contributors</p>
                  <AvatarStack people={contributors} max={8} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-5">
              <Link href={`/clubs/${project.organization.slug}`} className="flex items-center gap-3 hover:opacity-80">
                <Avatar name={project.organization.name} src={project.organization.logoUrl} seed={project.organization.id} square />
                <span className="font-medium">{project.organization.name}</span>
              </Link>
              <SocialLinks
                telegramUrl={project.organization.telegramUrl}
                instagramUrl={project.organization.instagramUrl}
                variant="icon"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
