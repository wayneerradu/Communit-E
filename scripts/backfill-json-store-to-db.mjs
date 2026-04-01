import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const root = process.cwd();
const dataDir = path.join(root, "data");

const mappings = [
  { key: "faults", file: "faults.json" },
  { key: "fault-notes", file: "fault-notes.json" },
  { key: "residents", file: "residents.json" },
  { key: "resident-history", file: "resident-history.json" },
  { key: "projects", file: "projects.json" },
  { key: "pr-comms", file: "pr-comms.json" },
  { key: "admin-notifications", file: "admin-notifications.json" },
  { key: "platform-settings", file: "platform-settings.json" },
  { key: "platform-services", file: "platform-services.json" },
  { key: "platform-control-center", file: "platform-control-center.json" }
];

async function ensureTable() {
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
}

async function upsertJson(key, payload) {
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
}

async function main() {
  await ensureTable();

  for (const item of mappings) {
    const filePath = path.join(dataDir, item.file);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const payload = JSON.parse(raw);
      await upsertJson(item.key, payload);
      console.log(`Backfilled ${item.key} from ${item.file}`);
    } catch (error) {
      console.warn(`Skipped ${item.file}: ${error instanceof Error ? error.message : "read/parse error"}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
