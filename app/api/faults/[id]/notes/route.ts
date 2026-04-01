import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addFaultNote, listFaultNotes } from "@/lib/workflows";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ items: listFaultNotes(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const payload = await request.json();
  try {
    const item = addFaultNote(id, {
      ...payload,
      authorName: payload.authorName ?? user.name
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add note." },
      { status: 400 }
    );
  }
}
