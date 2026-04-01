import { NextResponse } from "next/server";
import { promoteIdea } from "@/lib/workflows";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  return NextResponse.json(promoteIdea(id, sessionUser ?? undefined));
}
