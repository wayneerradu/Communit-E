import { NextResponse } from "next/server";
import { getReliableSastEpochMs } from "@/lib/ntp-time";

export const runtime = "nodejs";

export async function GET() {
  const { epochMs, source } = await getReliableSastEpochMs();

  return NextResponse.json(
    {
      epochMs,
      source,
      timezone: "Africa/Johannesburg"
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
