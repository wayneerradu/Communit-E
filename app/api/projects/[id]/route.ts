import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateProject } from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const item = updateProject(id, payload);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update project." },
      { status: 400 }
    );
  }
}
