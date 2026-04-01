import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { addAdminNotifications } from "@/lib/notification-store";
import { canAccessHelpForum, createHelpForumThread, getSuperAdminTargetEmails, listHelpForumThreads } from "@/lib/help-forum-store";

const createThreadSchema = z.object({
  module: z.string().min(1),
  page: z.string().min(1),
  title: z.string().min(3),
  type: z.enum(["question", "change-request"]),
  body: z.string().min(3),
  tags: z.array(z.string()).optional()
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listHelpForumThreads();
  return NextResponse.json({ items: threads });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canAccessHelpForum(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createThreadSchema.parse(await request.json());
    const thread = await createHelpForumThread(payload, user);

    const superAdminTargets = getSuperAdminTargetEmails();
    if (superAdminTargets.length > 0) {
      await addAdminNotifications([
        {
          id: randomUUID(),
          title: "Help forum update",
          detail: `${user.name} posted ${payload.type === "question" ? "a question" : "a change request"}: ${payload.title}`,
          channel: "in-app",
          audience: "admins",
          targetEmails: superAdminTargets,
          createdAt: new Date().toISOString(),
          importance: "informational",
          tone: "warning",
          readBy: []
        }
      ]);
    }

    return NextResponse.json({ item: thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create thread." }, { status: 400 });
  }
}
