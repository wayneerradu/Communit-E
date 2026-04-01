import { NextResponse } from "next/server";
import { createResolution, listResolutions } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listResolutions() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const item = createResolution(payload);
  return NextResponse.json({ item }, { status: 201 });
}
