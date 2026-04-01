import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { canAccessHelpForum, deleteHelpForumThread, updateHelpForumThreadStatus } from "@/lib/help-forum-store";

const statusSchema = z.object({
  status: z.enum(["open", "answered", "implemented", "closed"])
});

export async function PATCH(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can update thread status." }, { status: 403 });
  }

  try {
    const { threadId } = await context.params;
    const payload = statusSchema.parse(await request.json());
    const thread = await updateHelpForumThreadStatus(threadId, payload.status);
    return NextResponse.json({ item: thread });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update thread." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can delete threads." }, { status: 403 });
  }

  try {
    const { threadId } = await context.params;
    await deleteHelpForumThread(threadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete thread." }, { status: 400 });
  }
}
