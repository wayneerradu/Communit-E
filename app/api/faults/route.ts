import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createFault, listFaultNotes, listFaults } from "@/lib/workflows";

export async function GET() {
  return NextResponse.json({ items: listFaults(), notes: listFaultNotes() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.json();
  try {
    const fault = createFault(payload, { name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ item: fault }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create fault." },
      { status: 400 }
    );
  }
}
