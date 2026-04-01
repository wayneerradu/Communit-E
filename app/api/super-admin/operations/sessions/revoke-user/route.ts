import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, revokeAllSessionsForUser } from "@/lib/auth";

const schema = z.object({
  userEmail: z.string().email()
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userEmail } = schema.parse(await request.json());
  await revokeAllSessionsForUser(userEmail);
  return NextResponse.json({
    ok: true,
    message: `All sessions revoked for ${userEmail}.`
  });
}
