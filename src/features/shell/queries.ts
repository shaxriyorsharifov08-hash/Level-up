import "server-only";
import { getUserWorkspaces } from "@/features/organizations/queries";

export type ShellData = {
  workspaces: { id: string; slug: string; name: string; logoUrl: string | null }[];
  unreadMessages: number;
  unreadNotifications: number;
};

/** Data the signed-in navigation needs on every page (workspaces, unread counters). */
export async function getShellData(userId: string): Promise<ShellData> {
  const workspaces = await getUserWorkspaces(userId);
  return { workspaces, unreadMessages: 0, unreadNotifications: 0 };
}
