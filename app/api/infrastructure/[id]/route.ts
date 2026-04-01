import { NextResponse } from "next/server";
import { updateInfrastructureAsset } from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await request.json();
  const item = updateInfrastructureAsset(id, payload);
  return NextResponse.json({ item });
}
