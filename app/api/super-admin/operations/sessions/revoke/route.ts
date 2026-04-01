import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, revokeSession } from "@/lib/auth";

const schema = z.object({
  sessionId: z.string().min(3)
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = schema.parse(await request.json());
  await revokeSession(sessionId);
  return NextResponse.json({
    ok: true,
    message: "Session revoked."
  });
}
