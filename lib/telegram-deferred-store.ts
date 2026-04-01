import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppNotification } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const deferredFile = path.join(dataDir, "telegram-deferred.json");

export type DeferredTelegramItem = {
  id: string;
  queuedAt: string;
  sendAfter: string;
  notification: AppNotification;
};

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

export async function readDeferredTelegramStore(): Promise<DeferredTelegramItem[]> {
  await ensureDataDir();
  try {
    const content = await readFile(deferredFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as DeferredTelegramItem[]) : [];
  } catch {
    return [];
  }
}

export async function writeDeferredTelegramStore(items: DeferredTelegramItem[]) {
  await ensureDataDir();
  await writeFile(deferredFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}
