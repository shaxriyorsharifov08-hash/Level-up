import { NextResponse } from "next/server";
import { getMembership, getMessages, markRead } from "@/features/chat/queries";
import { getCurrentUser } from "@/lib/auth";

/**
 * Chat polling endpoint.
 *   GET ?after=<id>   → messages newer than <id> (and marks the conversation read)
 *   GET ?before=<id>  → the previous page of older messages
 */
export async function GET(request: Request, { params }: RouteContext<"/api/conversations/[id]/messages">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await getMembership(id, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const after = Number(searchParams.get("after"));
  const before = Number(searchParams.get("before"));

  if (Number.isInteger(before) && before > 0) {
    return NextResponse.json({ messages: await getMessages(id, { before }) }, { headers: { "Cache-Control": "no-store" } });
  }

  const messages = await getMessages(id, { after: Number.isInteger(after) && after >= 0 ? after : 0, limit: 200 });
  if (messages.length > 0 || searchParams.get("read") === "1") await markRead(id, user.id);
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
