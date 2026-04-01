import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { addAdminNotifications } from "@/lib/notification-store";
import { addHelpForumComment, canAccessHelpForum, findHelpForumThread, getSuperAdminTargetEmails } from "@/lib/help-forum-store";

const commentSchema = z.object({
  body: z.string().min(1)
});

export async function POST(request: Request, context: { params: Promise<{ threadId: string }> }) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { threadId } = await context.params;
    const payload = commentSchema.parse(await request.json());
    const existingThread = await findHelpForumThread(threadId);
    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    const thread = await addHelpForumComment(threadId, payload, user);
    const superAdminTargets = getSuperAdminTargetEmails();

    if (superAdminTargets.length > 0) {
      await addAdminNotifications([
        {
          id: randomUUID(),
          title: "Help forum comment",
          detail: `${user.name} replied in ${existingThread.module} / ${existingThread.page}: ${existingThread.title}`,
          channel: "in-app",
          audience: "admins",
          targetEmails: superAdminTargets,
          createdAt: new Date().toISOString(),
          importance: "informational",
          tone: "default",
          readBy: []
        }
      ]);
    }

    return NextResponse.json({ item: thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add comment." }, { status: 400 });
  }
}
