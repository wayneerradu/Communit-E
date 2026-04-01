import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendPRComm } from "@/lib/workflows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "PRO" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  return NextResponse.json({ item: sendPRComm(id) });
}
