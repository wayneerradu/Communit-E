import { isDatabaseConfigured, prisma } from "@/lib/prisma";

const WRITE_QUEUE = new Map<string, Promise<void>>();
let tableReadyPromise: Promise<void> | null = null;

async function ensureJsonStoreTable() {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!tableReadyPromise) {
    tableReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "JsonStore" (
          "key" TEXT PRIMARY KEY,
          "payload" JSONB NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "JsonStore_updatedAt_idx"
        ON "JsonStore" ("updatedAt")
      `);
    })().catch(() => {
      tableReadyPromise = null;
    });
  }

  await tableReadyPromise;
}

export async function readDbJsonStore<T>(key: string): Promise<T | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    await ensureJsonStoreTable();
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "payload" FROM "JsonStore" WHERE "key" = $1 LIMIT 1`,
      key
    )) as Array<{ payload: unknown }>;

    if (!rows[0]) {
      return null;
    }

    return rows[0].payload as T;
  } catch {
    return null;
  }
}

export async function writeDbJsonStore<T>(key: string, payload: T): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    await ensureJsonStoreTable();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "JsonStore" ("key", "payload", "createdAt", "updatedAt")
      VALUES ($1, $2::jsonb, NOW(), NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "payload" = EXCLUDED."payload",
        "updatedAt" = NOW()
      `,
      key,
      JSON.stringify(payload)
    );
  } catch {
    // Best-effort mirror write; file storage remains fallback.
  }
}

export function queueDbJsonStoreWrite<T>(key: string, payload: T) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const previous = WRITE_QUEUE.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => writeDbJsonStore(key, payload))
    .finally(() => {
      if (WRITE_QUEUE.get(key) === next) {
        WRITE_QUEUE.delete(key);
      }
    });

  WRITE_QUEUE.set(key, next);
}
