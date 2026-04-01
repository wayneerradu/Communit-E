import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const alertLogFile = path.join(dataDir, "telegram-alert-log.json");

type TelegramAlertLog = Record<string, string>;

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function readAlertLog(): Promise<TelegramAlertLog> {
  await ensureDataDir();
  try {
    const content = await readFile(alertLogFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as TelegramAlertLog) : {};
  } catch {
    return {};
  }
}

async function writeAlertLog(log: TelegramAlertLog) {
  await ensureDataDir();
  await writeFile(alertLogFile, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

function pruneOldEntries(log: TelegramAlertLog, nowMs = Date.now()) {
  const maxAgeMs = 45 * 24 * 60 * 60 * 1000;
  const entries = Object.entries(log).filter(([, timestamp]) => {
    const parsed = new Date(timestamp).getTime();
    return Number.isFinite(parsed) && nowMs - parsed <= maxAgeMs;
  });
  return Object.fromEntries(entries);
}

export async function markTelegramAlertQueuedOnce(key: string) {
  const current = pruneOldEntries(await readAlertLog());
  if (current[key]) {
    return false;
  }
  current[key] = new Date().toISOString();
  await writeAlertLog(current);
  return true;
}
