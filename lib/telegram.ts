import type { AppNotification, PlatformSettings } from "@/types/domain";
import { readDeferredTelegramStore, writeDeferredTelegramStore } from "@/lib/telegram-deferred-store";

const TELEGRAM_TZ = "Africa/Johannesburg";

type TelegramSendResult = {
  ok: boolean;
  reason?: string;
};

function patchNotification(notification: AppNotification, patch: Partial<AppNotification>): AppNotification {
  return {
    ...notification,
    ...patch
  };
}

function parseTimeToMinutes(value: string) {
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number.parseInt(hoursPart ?? "", 10);
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function isWithinQuietHours(settings: PlatformSettings, now = new Date()) {
  const quietStart = parseTimeToMinutes(settings.notificationPolicy.quietHoursStart);
  const quietEnd = parseTimeToMinutes(settings.notificationPolicy.quietHoursEnd);
  if (quietStart === null || quietEnd === null) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TELEGRAM_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "0", 10);
  const current = hour * 60 + minute;

  if (quietStart === quietEnd) {
    return true;
  }
  if (quietStart < quietEnd) {
    return current >= quietStart && current < quietEnd;
  }
  return current >= quietStart || current < quietEnd;
}

function isQuietDay(settings: PlatformSettings, now = new Date()) {
  const dayCode = new Intl.DateTimeFormat("en-US", {
    timeZone: TELEGRAM_TZ,
    weekday: "short"
  })
    .format(now)
    .slice(0, 3)
    .toUpperCase();
  return settings.notificationPolicy.quietDays.includes(dayCode);
}

function toSastParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TELEGRAM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number.parseInt(map.year ?? "1970", 10),
    month: Number.parseInt(map.month ?? "1", 10),
    day: Number.parseInt(map.day ?? "1", 10),
    weekday: (map.weekday ?? "Mon").slice(0, 3).toUpperCase(),
    hour: Number.parseInt(map.hour ?? "0", 10),
    minute: Number.parseInt(map.minute ?? "0", 10),
    second: Number.parseInt(map.second ?? "0", 10)
  };
}

function toUtcIsoFromSast(year: number, month: number, day: number, hourSast: number, minute: number, second = 0) {
  const utcMs = Date.UTC(year, month - 1, day, hourSast - 2, minute, second);
  return new Date(utcMs).toISOString();
}

function addDaysSast(year: number, month: number, day: number, daysToAdd: number) {
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const next = new Date(utc + daysToAdd * 24 * 60 * 60 * 1000);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
}

function weekdayCodeForSastDate(year: number, month: number, day: number) {
  const iso = toUtcIsoFromSast(year, month, day, 9, 0);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TELEGRAM_TZ,
    weekday: "short"
  })
    .format(new Date(iso))
    .slice(0, 3)
    .toUpperCase();
}

function nextBusinessDayNineAmSast(settings: PlatformSettings, now = new Date()) {
  const parts = toSastParts(now);
  let candidate = addDaysSast(parts.year, parts.month, parts.day, 1);

  for (let i = 0; i < 10; i += 1) {
    const weekday = weekdayCodeForSastDate(candidate.year, candidate.month, candidate.day);
    if (!settings.notificationPolicy.quietDays.includes(weekday)) {
      return toUtcIsoFromSast(candidate.year, candidate.month, candidate.day, 9, 0, 0);
    }
    candidate = addDaysSast(candidate.year, candidate.month, candidate.day, 1);
  }

  return toUtcIsoFromSast(parts.year, parts.month, parts.day, 9, 0, 0);
}

function formatTelegramMessage(notification: AppNotification) {
  return [
    "\uD83D\uDD14 CommUNIT-E Alert",
    notification.title,
    notification.detail,
    `Time: ${new Date(notification.createdAt).toLocaleString("en-ZA", { timeZone: TELEGRAM_TZ })}`
  ].join("\n");
}

function getTelegramSecrets() {
  return {
    liveBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "",
    demoBotToken: process.env.TELEGRAM_BOT_TOKEN_DEMO?.trim() ?? "",
    liveChatIdFromEnv: process.env.TELEGRAM_CHAT_ID?.trim() ?? "",
    demoChatIdFromEnv: process.env.TELEGRAM_CHAT_ID_DEMO?.trim() ?? ""
  };
}

function resolveTelegramChannel(settings: PlatformSettings) {
  const mode = settings.communicationSettings.telegram.mode;
  const secrets = getTelegramSecrets();

  if (mode === "off") {
    return {
      mode,
      botToken: "",
      chatId: "",
      groupName: settings.communicationSettings.telegram.liveGroupName
    };
  }

  if (mode === "demo") {
    return {
      mode,
      botToken:
        settings.communicationSettings.telegram.demoBotToken ||
        secrets.demoBotToken ||
        secrets.liveBotToken,
      chatId: settings.communicationSettings.telegram.demoChatId || secrets.demoChatIdFromEnv,
      groupName: settings.communicationSettings.telegram.demoGroupName
    };
  }

  return {
    mode,
    botToken: secrets.liveBotToken,
    chatId: settings.communicationSettings.telegram.liveChatId || secrets.liveChatIdFromEnv,
    groupName: settings.communicationSettings.telegram.liveGroupName
  };
}

function isTelegramConfigured(settings: PlatformSettings) {
  const channel = resolveTelegramChannel(settings);
  if (channel.mode === "off") {
    return false;
  }
  if (channel.botToken && channel.chatId) {
    return true;
  }
  if (channel.mode === "live") {
    return settings.telegram.botTokenConfigured && settings.telegram.chatIdConfigured;
  }
  return false;
}

async function sendTelegramMessage(text: string, settings: PlatformSettings): Promise<TelegramSendResult> {
  const channel = resolveTelegramChannel(settings);
  const { botToken, chatId } = channel;
  if (channel.mode === "off") {
    return { ok: false, reason: "Telegram notifications are disabled." };
  }
  if (!botToken || !chatId) {
    return { ok: false, reason: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing on the server." };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!response.ok || !payload.ok) {
      return { ok: false, reason: payload.description ?? `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unknown Telegram send failure."
    };
  }
}

async function queueDeferredTelegramNotification(notification: AppNotification, settings: PlatformSettings) {
  const current = await readDeferredTelegramStore();
  const exists = current.some((item) => item.notification.id === notification.id);
  if (exists) {
    return null;
  }
  const sendAfter = nextBusinessDayNineAmSast(settings);
  current.push({
    id: `deferred-${notification.id}`,
    queuedAt: new Date().toISOString(),
    sendAfter,
    notification
  });
  await writeDeferredTelegramStore(current);
  return sendAfter;
}

export async function processDeferredTelegramQueue(settings: PlatformSettings) {
  const summary = {
    processed: 0,
    sent: 0,
    failed: 0,
    pending: 0
  };

  if (!isTelegramConfigured(settings)) {
    return summary;
  }

  const current = await readDeferredTelegramStore();
  if (current.length === 0) {
    return summary;
  }

  const nowMs = Date.now();
  const keep: typeof current = [];

  for (const item of current) {
    const dueMs = new Date(item.sendAfter).getTime();
    if (!Number.isFinite(dueMs) || dueMs > nowMs) {
      keep.push(item);
      continue;
    }

    summary.processed += 1;
    const result = await sendTelegramMessage(formatTelegramMessage(item.notification), settings);
    if (!result.ok) {
      summary.failed += 1;
      keep.push({
        ...item,
        sendAfter: nextBusinessDayNineAmSast(settings)
      });
    } else {
      summary.sent += 1;
    }
  }

  summary.pending = keep.length;
  await writeDeferredTelegramStore(keep);
  return summary;
}

export async function dispatchTelegramNotification(
  notification: AppNotification,
  settings: PlatformSettings,
  options?: { force?: boolean }
) {
  if (notification.channel !== "telegram") {
    return { notification, delivery: { ok: false, reason: "Not a Telegram notification." } };
  }

  if (!isTelegramConfigured(settings)) {
    const channel = resolveTelegramChannel(settings);
    const disabledReason =
      channel.mode === "off"
        ? "Telegram notifications are disabled in Communication Settings."
        : "Telegram is not fully configured.";
    return {
      notification: patchNotification(notification, {
        tone: "warning",
        detail: `${notification.detail} (${disabledReason})`
      }),
      delivery: { ok: false, reason: disabledReason }
    };
  }

  const force = options?.force ?? false;
  if (!force && settings.notificationPolicy.telegramCriticalOnly && notification.importance !== "critical") {
    return {
      notification: patchNotification(notification, {
        tone: "default",
        detail: `${notification.detail} (Skipped by Telegram critical-only policy)`
      }),
      delivery: { ok: false, reason: "Skipped by critical-only policy." }
    };
  }

  if (!force && (isQuietDay(settings) || isWithinQuietHours(settings))) {
    const sendAfter = await queueDeferredTelegramNotification(notification, settings);
    const sendAfterLabel = sendAfter
      ? new Date(sendAfter).toLocaleString("en-ZA", { timeZone: TELEGRAM_TZ })
      : "next business day 09:00 SAST";
    return {
      notification: patchNotification(notification, {
        tone: "default",
        detail: `${notification.detail} (Queued for delivery at ${sendAfterLabel})`
      }),
      delivery: { ok: false, reason: "Queued for next business day 09:00 SAST." }
    };
  }

  const result = await sendTelegramMessage(formatTelegramMessage(notification), settings);
  if (!result.ok) {
    return {
      notification: patchNotification(notification, {
        tone: "warning",
        detail: `${notification.detail} (Telegram send failed: ${result.reason ?? "unknown error"})`
      }),
      delivery: result
    };
  }

  const channel = resolveTelegramChannel(settings);
  return {
    notification: patchNotification(notification, {
      tone: "success",
      detail: `${notification.detail} (Telegram sent to ${channel.groupName})`
    }),
    delivery: result
  };
}

export async function sendTelegramTestAlert(settings: PlatformSettings) {
  const nowIso = new Date().toISOString();
  const notification: AppNotification = {
    id: `telegram-test-${Date.now()}`,
    title: "Telegram Test Alert",
    detail: "This is a live test from Super Admin settings.",
    channel: "telegram",
    audience: "admins",
    createdAt: nowIso,
    importance: "informational",
    tone: "default"
  };

  return dispatchTelegramNotification(notification, settings, { force: true });
}
