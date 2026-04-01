import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type RateEntry = {
  key: string;
  attempts: string[];
};

const dataDir = path.join(process.cwd(), "data");
const rateLimitFile = path.join(dataDir, "public-join-rate-limit.json");
const windowMs = 15 * 60 * 1000;
const maxAttempts = 3;

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readEntries(): Promise<RateEntry[]> {
  await ensureDataDir();

  try {
    const content = await readFile(rateLimitFile, "utf8");
    return JSON.parse(content) as RateEntry[];
  } catch {
    return [];
  }
}

async function writeEntries(entries: RateEntry[]) {
  await ensureDataDir();
  await writeFile(rateLimitFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function guardPublicJoinSubmission(key: string) {
  const now = Date.now();
  const entries = await readEntries();
  const freshEntries = entries
    .map((entry) => ({
      ...entry,
      attempts: entry.attempts.filter((attempt) => now - new Date(attempt).getTime() <= windowMs)
    }))
    .filter((entry) => entry.attempts.length > 0);

  const existing = freshEntries.find((entry) => entry.key === key);
  if (existing && existing.attempts.length >= maxAttempts) {
    await writeEntries(freshEntries);
    return {
      allowed: false,
      retryAfterMinutes: 15
    };
  }

  const nextAttempt = new Date(now).toISOString();
  if (existing) {
    existing.attempts.push(nextAttempt);
  } else {
    freshEntries.push({
      key,
      attempts: [nextAttempt]
    });
  }

  await writeEntries(freshEntries);
  return {
    allowed: true,
    retryAfterMinutes: 0
  };
}

export function isPublicJoinSubmissionTooFast(startedAt: string | undefined, minimumCompletionSeconds: number) {
  if (!startedAt) {
    return true;
  }

  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) {
    return true;
  }

  return Date.now() - started < minimumCompletionSeconds * 1000;
}
