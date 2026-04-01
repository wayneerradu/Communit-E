import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/workflows";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listProjects() });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const item = createProject(payload, sessionUser);
  return NextResponse.json({ item }, { status: 201 });
}
