import "server-only";
import { countUnreadConversations } from "@/features/chat/queries";
import { getUserWorkspaces } from "@/features/organizations/queries";

export type ShellData = {
  workspaces: { id: string; slug: string; name: string; logoUrl: string | null }[];
  unreadMessages: number;
  unreadNotifications: number;
};

/** Data the signed-in navigation needs on every page (workspaces, unread counters). */
export async function getShellData(userId: string): Promise<ShellData> {
  const [workspaces, unreadMessages] = await Promise.all([
    getUserWorkspaces(userId),
    countUnreadConversations(userId),
  ]);
  return { workspaces, unreadMessages, unreadNotifications: 0 };
}
