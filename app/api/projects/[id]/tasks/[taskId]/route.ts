import { NextResponse } from "next/server";
import { updateProjectTask } from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;
    const payload = await request.json();
    const result = updateProjectTask(id, taskId, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update task." },
      { status: 400 }
    );
  }
}
