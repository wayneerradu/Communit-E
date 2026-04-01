import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { voteForResolution } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only admins can vote on resolutions." }, { status: 403 });
  }

  const { id } = await params;
  const payload = await request.json();
  const item = voteForResolution(id, payload.choice, user.email);
  return NextResponse.json(item);
}
