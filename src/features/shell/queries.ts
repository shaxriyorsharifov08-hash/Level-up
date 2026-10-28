import "server-only";

export type ShellData = {
  workspaces: { id: string; slug: string; name: string; logoUrl: string | null }[];
  unreadMessages: number;
  unreadNotifications: number;
};

/** Data the signed-in navigation needs on every page (workspaces, unread counters). */
export async function getShellData(_userId: string): Promise<ShellData> {
  return { workspaces: [], unreadMessages: 0, unreadNotifications: 0 };
}
