import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addProjectTask } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const item = addProjectTask(id, payload);
  return NextResponse.json({ item }, { status: 201 });
}
