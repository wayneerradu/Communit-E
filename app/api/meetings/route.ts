import { NextResponse } from "next/server";
import { createMeetingMinute, listMeetingMinutes } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listMeetingMinutes() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const item = createMeetingMinute(payload);
  return NextResponse.json({ item }, { status: 201 });
}
