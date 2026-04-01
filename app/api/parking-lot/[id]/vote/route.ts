import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { voteForIdea } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const item = voteForIdea(id, body.userEmail ?? user.email);
  return NextResponse.json({ item });
}
