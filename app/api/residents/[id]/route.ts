import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateResidentDetails, updateResidentStatus } from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();

  try {
    const result =
      typeof payload?.status === "string"
        ? updateResidentStatus(id, payload, { name: user.name, email: user.email, role: user.role })
        : updateResidentDetails(id, payload, { name: user.name, email: user.email, role: user.role });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update resident." },
      { status: 400 }
    );
  }
}
