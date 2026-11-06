import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { getOrgMembers, getWorkspace } from "@/features/organizations/queries";
import { createTask, deleteProject, updateProject, updateTaskStatus } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/project-form";
import { TaskBoard } from "@/features/projects/components/task-board";
import { NewTaskForm } from "@/features/projects/components/task-form";
import { PROJECT_STATUS } from "@/features/projects/constants";
import { getProject, getProjectProgress, getTaskFormOptions, listTasks } from "@/features/projects/queries";
import { toDateInputValue } from "@/lib/dates";

export const metadata: Metadata = { title: "Project board" };

export default async function ProjectBoardPage({ params }: PageProps<"/workspace/[slug]/projects/[id]">) {
  const { slug, id } = await params;
  const { org, access } = await getWorkspace(slug);
  const project = await getProject(id);
  if (!project || project.organization.id !== org.id) notFound();

  const [tasks, progressMap, members, options] = await Promise.all([
    listTasks({ projectId: project.id }),
    getProjectProgress([project.id]),
    getOrgMembers(org.id),
    getTaskFormOptions(org.id),
  ]);
  const progress = progressMap.get(project.id)!;
  const status = PROJECT_STATUS[project.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <Badge variant={status.variant}>{status.label}</Badge>
            {!project.isPublic && <Badge variant="outline">Private</Badge>}
          </div>
          {project.summary && <p className="mt-1 text-sm text-muted-foreground">{project.summary}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{progress.done}/{progress.total} done</span>
              <span>{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} />
          </div>
          {project.isPublic && (
            <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary-text hover:underline">
              Public page <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      <NewTaskForm
        action={createTask.bind(null, org.id)}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        projects={options.projects}
        events={options.events}
        fixedProjectId={project.id}
      />
      <TaskBoard tasks={tasks} moveTask={updateTaskStatus} showProject={false} />

      {access.canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Project settings</CardTitle>
            <ActionButton
              action={deleteProject.bind(null, project.id)}
              variant="ghost"
              size="sm"
              confirm="Delete this project and all of its tasks?"
            >
              <Trash2 /> Delete project
            </ActionButton>
          </CardHeader>
          <CardContent>
            <ProjectForm
              action={updateProject.bind(null, project.id)}
              submitLabel="Save project"
              values={{ ...project, dueDate: toDateInputValue(project.dueDate) }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
