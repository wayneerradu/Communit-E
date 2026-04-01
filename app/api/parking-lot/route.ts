import { NextResponse } from "next/server";
import { createParkingLotIdea, listParkingLotIdeas } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listParkingLotIdeas() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const item = createParkingLotIdea(payload);
  return NextResponse.json({ item }, { status: 201 });
}
