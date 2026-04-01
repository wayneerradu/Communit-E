import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { canAccessHelpForum, deleteHelpForumComment, updateHelpForumComment } from "@/lib/help-forum-store";

const updateSchema = z.object({
  body: z.string().min(1)
});

export async function PATCH(request: Request, context: { params: Promise<{ threadId: string; commentId: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { threadId, commentId } = await context.params;
    const payload = updateSchema.parse(await request.json());
    const thread = await updateHelpForumComment(threadId, commentId, payload, user);
    return NextResponse.json({ item: thread });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update comment." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ threadId: string; commentId: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can delete comments." }, { status: 403 });
  }

  try {
    const { threadId, commentId } = await context.params;
    const thread = await deleteHelpForumComment(threadId, commentId);
    return NextResponse.json({ item: thread });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete comment." }, { status: 400 });
  }
}
