import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { approvePRComm } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in to approve a communication." }, { status: 401 });
  }
  const { id } = await params;
  await request.json().catch(() => ({}));

  try {
    return NextResponse.json({ item: approvePRComm(id, user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to approve communication." }, { status: 400 });
  }
}
