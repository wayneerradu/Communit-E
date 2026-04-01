import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dispatchEmailNotification } from "@/lib/email-notifications";
import path from "node:path";
import { readPlatformSettings } from "@/lib/platform-store";
import { dispatchTelegramNotification, processDeferredTelegramQueue } from "@/lib/telegram";
import type { AppNotification } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const notificationsFile = path.join(dataDir, "admin-notifications.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function readNotifications(): Promise<AppNotification[]> {
  await ensureDataDir();

  try {
    const content = await readFile(notificationsFile, "utf8");
    return JSON.parse(stripBom(content)) as AppNotification[];
  } catch {
    return [];
  }
}

function normalizeNotifications(notifications: AppNotification[]) {
  return notifications.map((item) => ({
    ...item,
    importance: item.importance ?? (item.tone === "danger" ? "critical" : "informational"),
    targetEmails: (item.targetEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean),
    readBy: item.readBy ?? []
  }));
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
}

export async function listAdminNotifications() {
  const notifications = normalizeNotifications(await readNotifications());
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
  const enrichedNotifications: AppNotification[] = [];
  for (const notification of notifications) {
    if (notification.channel === "telegram") {
      const outcome = await dispatchTelegramNotification(notification, settings);
      enrichedNotifications.push(outcome.notification);
    } else if (notification.channel === "email") {
      const outcome = await dispatchEmailNotification(notification, settings);
      enrichedNotifications.push({
        ...notification,
        tone: outcome.ok ? "success" : "warning",
        detail: outcome.ok
          ? `${notification.detail} (Email sent to ${outcome.recipients.join(", ")})`
          : `${notification.detail} (Email not sent: ${outcome.reason ?? "Unknown reason"})`
      });
    } else {
      enrichedNotifications.push(notification);
    }
  }

  const current = normalizeNotifications(await readNotifications());
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
