import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dispatchEmailNotification } from "@/lib/email-notifications";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/db-json-store";
import path from "node:path";
import { readPlatformSettings } from "@/lib/platform-store";
import { dispatchTelegramNotification, processDeferredTelegramQueue } from "@/lib/telegram";
import type { AppNotification } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const notificationsFile = path.join(dataDir, "admin-notifications.json");
const notificationsDbKey = "admin-notifications";
const MAX_DELIVERY_ATTEMPTS = 5;
const EMAIL_RETRY_DELAY_MS = 15 * 60 * 1000;
const TELEGRAM_RETRY_DELAY_MS = 10 * 60 * 1000;

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function readNotifications(): Promise<AppNotification[]> {
  const dbItems = await readDbJsonStore<AppNotification[]>(notificationsDbKey);
  if (dbItems) {
    return dbItems;
  }

  await ensureDataDir();

  try {
    const content = await readFile(notificationsFile, "utf8");
    const parsed = JSON.parse(stripBom(content)) as AppNotification[];
    await writeDbJsonStore(notificationsDbKey, parsed);
    return parsed;
  } catch {
    return [];
  }
}

function normalizeNotifications(notifications: AppNotification[]) {
  return notifications.map((item) => ({
    ...item,
    importance: item.importance ?? (item.tone === "danger" ? "critical" : "informational"),
    targetEmails: (item.targetEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean),
    readBy: item.readBy ?? [],
    deliveryStatus:
      item.deliveryStatus ??
      (item.channel === "in-app" ? "sent" : "pending"),
    deliveryAttempts: item.deliveryAttempts ?? 0,
    deliveryError: item.deliveryError ?? undefined
  }));
}

function withDeliverySuccess(notification: AppNotification, nowIso: string) {
  return {
    ...notification,
    deliveryStatus: "sent" as const,
    deliveryAttempts: (notification.deliveryAttempts ?? 0) + 1,
    lastDeliveryAttemptAt: nowIso,
    nextRetryAt: undefined,
    deliveryError: undefined,
    tone: notification.channel === "in-app" ? notification.tone : "success"
  };
}

function withDeliveryQueued(notification: AppNotification, nowIso: string, nextRetryAt?: string, reason?: string) {
  return {
    ...notification,
    deliveryStatus: "queued" as const,
    deliveryAttempts: (notification.deliveryAttempts ?? 0) + 1,
    lastDeliveryAttemptAt: nowIso,
    nextRetryAt,
    deliveryError: reason,
    tone: (notification.tone === "danger" ? "danger" : "default") as AppNotification["tone"]
  };
}

function withDeliveryFailure(
  notification: AppNotification,
  nowIso: string,
  retryDelayMs: number,
  reason?: string
) {
  const attempts = (notification.deliveryAttempts ?? 0) + 1;
  const canRetry = attempts < MAX_DELIVERY_ATTEMPTS;

  return {
    ...notification,
    deliveryStatus: canRetry ? ("queued" as const) : ("failed" as const),
    deliveryAttempts: attempts,
    lastDeliveryAttemptAt: nowIso,
    nextRetryAt: canRetry ? new Date(Date.now() + retryDelayMs).toISOString() : undefined,
    deliveryError: reason ?? "Delivery failed.",
    tone: "warning" as const
  };
}

async function attemptNotificationDelivery(
  notification: AppNotification,
  settings: Awaited<ReturnType<typeof readPlatformSettings>>
) {
  const nowIso = new Date().toISOString();

  if (notification.channel === "in-app") {
    return withDeliverySuccess(notification, nowIso);
  }

  if (notification.channel === "telegram") {
    const outcome = await dispatchTelegramNotification(notification, settings);
    if (outcome.delivery.ok) {
      return withDeliverySuccess(notification, nowIso);
    }

    if (outcome.delivery.queuedUntil) {
      return withDeliveryQueued(notification, nowIso, outcome.delivery.queuedUntil, outcome.delivery.reason);
    }

    return withDeliveryFailure(notification, nowIso, TELEGRAM_RETRY_DELAY_MS, outcome.delivery.reason);
  }

  const outcome = await dispatchEmailNotification(notification, settings);
  if (outcome.ok) {
    return withDeliverySuccess(notification, nowIso);
  }

  return withDeliveryFailure(notification, nowIso, EMAIL_RETRY_DELAY_MS, outcome.reason);
}

function isRetryDue(notification: AppNotification) {
  if (notification.channel === "in-app") {
    return false;
  }
  if (notification.deliveryStatus !== "queued") {
    return false;
  }
  if (!notification.nextRetryAt) {
    return true;
  }
  const dueAt = new Date(notification.nextRetryAt).getTime();
  return Number.isFinite(dueAt) && dueAt <= Date.now();
}

function getRetentionDays(notification: AppNotification) {
  return notification.importance === "critical" ? 14 : 7;
}

function isVisibleForUser(notification: AppNotification, normalizedEmail: string) {
  if (notification.targetEmails && notification.targetEmails.length > 0 && !notification.targetEmails.includes(normalizedEmail)) {
    return false;
  }

  const isRead = (notification.readBy ?? []).includes(normalizedEmail);
  if (!isRead) {
    return true;
  }

  const ageMs = Date.now() - new Date(notification.createdAt).getTime();
  const maxAgeMs = getRetentionDays(notification) * 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs;
}

async function writeNotifications(notifications: AppNotification[]) {
  await ensureDataDir();
  await writeFile(notificationsFile, `${JSON.stringify(notifications, null, 2)}\n`, "utf8");
  await writeDbJsonStore(notificationsDbKey, notifications);
}

export async function listAdminNotifications() {
  const notifications = await processNotificationDeliveryQueue();
  return [...notifications].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function listVisibleAdminNotifications(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const notifications = await listAdminNotifications();
  return notifications.filter((item) => isVisibleForUser(item, normalizedEmail));
}

export async function addAdminNotifications(notifications: AppNotification[]) {
  const settings = await readPlatformSettings();
  await processDeferredTelegramQueue(settings);
  const current = normalizeNotifications(await readNotifications());
  const enrichedNotifications: AppNotification[] = [];

  for (const notification of notifications) {
    const normalizedNotification = normalizeNotifications([notification])[0];
    enrichedNotifications.push(await attemptNotificationDelivery(normalizedNotification, settings));
  }

  const merged = normalizeNotifications([...enrichedNotifications, ...current]);
  const deduped = new Map<string, AppNotification>();
  for (const item of merged) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  }
  const next = Array.from(deduped.values())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 100);
  await writeNotifications(next);
  return next;
}

export async function processNotificationDeliveryQueue() {
  const settings = await readPlatformSettings();
  await processDeferredTelegramQueue(settings);
  const current = normalizeNotifications(await readNotifications());
  let changed = false;
  const next: AppNotification[] = [];

  for (const item of current) {
    if (isRetryDue(item)) {
      next.push(await attemptNotificationDelivery(item, settings));
      changed = true;
      continue;
    }
    next.push(item);
  }

  if (changed) {
    await writeNotifications(next);
  }

  return next;
}

export async function purgeAdminNotifications() {
  await writeNotifications([]);
  return [];
}

export async function markAdminNotificationsRead(userEmail: string, notificationIds?: string[]) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const current = normalizeNotifications(await readNotifications());
  const ids = notificationIds ? new Set(notificationIds) : null;

  const next = current.map((item) => {
    if (ids && !ids.has(item.id)) {
      return item;
    }

    if (item.readBy?.includes(normalizedEmail)) {
      return item;
    }

    return {
      ...item,
      readBy: [...(item.readBy ?? []), normalizedEmail]
    };
  });

  await writeNotifications(next);
  return next;
}
