import { NextResponse } from "next/server";
import { addProjectTask } from "@/lib/workflows";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await request.json();
  const item = addProjectTask(id, payload);
  return NextResponse.json({ item }, { status: 201 });
}
