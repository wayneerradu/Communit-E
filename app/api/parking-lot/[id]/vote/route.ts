import { NextResponse } from "next/server";
import { voteForIdea } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const item = voteForIdea(id, body.userEmail);
  return NextResponse.json({ item });
}
