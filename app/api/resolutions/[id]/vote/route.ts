import { NextResponse } from "next/server";
import { voteForResolution } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await request.json();
  const item = voteForResolution(id, payload.choice);
  return NextResponse.json(item);
}
