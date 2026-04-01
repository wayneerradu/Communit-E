import { NextResponse } from "next/server";
import { readPlatformSettings } from "@/lib/platform-store";
import { runTelegramCriticalAlertSweep } from "@/lib/telegram-critical-alerts";
import { runTelegramMorningWeatherJob } from "@/lib/telegram-morning-weather";
import { processDeferredTelegramQueue } from "@/lib/telegram";

function isAuthorized(request: Request) {
  const expected = process.env.JOB_RUNNER_TOKEN?.trim();
  if (!expected) {
    return false;
  }

  const headerToken =
    request.headers.get("x-job-token")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";

  return Boolean(headerToken) && headerToken === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized job token." }, { status: 401 });
  }

  await runTelegramCriticalAlertSweep();
  const settings = await readPlatformSettings();
  const deferred = await processDeferredTelegramQueue(settings);
  const morningWeather = await runTelegramMorningWeatherJob(settings);

  return NextResponse.json({
    ok: true,
    deferred,
    morningWeather
  });
}
