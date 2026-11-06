import "server-only";
import { countUnreadConversations } from "@/features/chat/queries";
import { countUnreadNotifications } from "@/features/feed/queries";
import { getUserWorkspaces } from "@/features/organizations/queries";
import { getBalance } from "@/features/rewards/service";

export type ShellData = {
  workspaces: { id: string; slug: string; name: string; logoUrl: string | null }[];
  unreadMessages: number;
  unreadNotifications: number;
  tokenBalance: number;
};

/** Data the signed-in navigation needs on every page (workspaces, unread counters). */
export async function getShellData(userId: string): Promise<ShellData> {
  const [workspaces, unreadMessages, unreadNotifications, tokenBalance] = await Promise.all([
    getUserWorkspaces(userId),
    countUnreadConversations(userId),
    countUnreadNotifications(userId),
    getBalance(userId),
  ]);
  return { workspaces, unreadMessages, unreadNotifications, tokenBalance };
}
