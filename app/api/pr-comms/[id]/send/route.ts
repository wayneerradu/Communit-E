import { NextResponse } from "next/server";
import { sendPRComm } from "@/lib/workflows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ item: sendPRComm(id) });
}
