import "server-only";
import { db, type DbOrTx } from "@/db";
import { notifications } from "@/db/schema";

/** Send an in-app notification to one or more users (duplicates and the actor are skipped). */
export async function notify(
  userIds: (string | null | undefined)[],
  notification: { title: string; body?: string; link?: string },
  options: { exclude?: string; tx?: DbOrTx } = {},
) {
  const recipients = [...new Set(userIds.filter((id): id is string => !!id && id !== options.exclude))];
  if (recipients.length === 0) return;
  await (options.tx ?? db).insert(notifications).values(
    recipients.map((userId) => ({
      userId,
      title: notification.title,
      body: notification.body ?? null,
      link: notification.link ?? null,
    })),
  );
}
