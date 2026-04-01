import { NextResponse } from "next/server";
import { readPlatformSettings } from "@/lib/platform-store";

export async function GET() {
  const settings = await readPlatformSettings();
  return NextResponse.json({
    googleMapsApiKey: settings.googleWorkspace.googleMapsApiKey,
    turnstileEnabled: settings.publicJoinProtection.turnstileEnabled,
    turnstileSiteKey: settings.publicJoinProtection.turnstileSiteKey,
    minimumCompletionSeconds: settings.publicJoinProtection.minimumCompletionSeconds
  });
}
