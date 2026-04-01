import { NextResponse } from "next/server";
import { z } from "zod";
import { revokeSession } from "@/lib/auth";

const schema = z.object({
  sessionId: z.string().min(3)
});

export async function POST(request: Request) {
  const { sessionId } = schema.parse(await request.json());
  await revokeSession(sessionId);
  return NextResponse.json({
    ok: true,
    message: "Session revoked."
  });
}
