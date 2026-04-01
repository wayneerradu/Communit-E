import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createResident, listResidentHistory, listResidents } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listResidents(), history: listResidentHistory() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const item = createResident(payload, { name: user.name, email: user.email, role: user.role });
  return NextResponse.json({ item }, { status: 201 });
}
