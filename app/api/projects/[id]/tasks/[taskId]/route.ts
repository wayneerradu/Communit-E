import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateProjectTask } from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
