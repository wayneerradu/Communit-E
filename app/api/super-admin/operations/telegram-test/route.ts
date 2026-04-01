import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readPlatformSettings } from "@/lib/platform-store";
import { sendTelegramTestAlert } from "@/lib/telegram";

export async function POST() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readPlatformSettings();
  const outcome = await sendTelegramTestAlert(settings);
  const telegramMode = settings.communicationSettings.telegram.mode;
  const targetLabel =
    telegramMode === "demo"
      ? settings.communicationSettings.telegram.demoGroupName
      : settings.communicationSettings.telegram.liveGroupName;

  return NextResponse.json({
    ok: outcome.delivery.ok,
    message: outcome.delivery.ok
      ? `Telegram test sent to ${targetLabel} (${telegramMode.toUpperCase()} mode).`
      : `Telegram test failed in ${telegramMode.toUpperCase()} mode: ${outcome.delivery.reason ?? "Unknown error."}`
  });
}
