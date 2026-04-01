import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createPRComm, listPRComms } from "@/lib/workflows";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listPRComms() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in to create a communication draft." }, { status: 401 });
  }
  const payload = await request.json();
  const item = createPRComm(payload, user);
  return NextResponse.json({ item }, { status: 201 });
}
