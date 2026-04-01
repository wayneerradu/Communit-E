import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createResolution, listResolutions } from "@/lib/workflows";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listResolutions() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const item = createResolution(payload);
  return NextResponse.json({ item }, { status: 201 });
}
