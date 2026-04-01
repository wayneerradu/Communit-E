import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readPlatformSettings } from "@/lib/platform-store";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readPlatformSettings();
  return NextResponse.json({
    googleMapsApiKey: settings.googleWorkspace.googleMapsApiKey
  });
}
