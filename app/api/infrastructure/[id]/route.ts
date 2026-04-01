import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateInfrastructureAsset } from "@/lib/workflows";

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
  const item = updateInfrastructureAsset(id, payload);
  return NextResponse.json({ item });
}
