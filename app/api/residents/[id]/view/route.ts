import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logResidentViewed } from "@/lib/workflows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = logResidentViewed(id, { name: user.name, email: user.email });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to log resident view." },
      { status: 400 }
    );
  }
}
