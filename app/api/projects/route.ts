import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/workflows";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ items: listProjects() });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  const payload = await request.json();
  const item = createProject(payload, sessionUser ?? undefined);
  return NextResponse.json({ item }, { status: 201 });
}
