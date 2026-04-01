import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Fault } from "@/types/domain";

type FaultImportBackup = {
  id: string;
  createdAt: string;
  itemCount: number;
  faults: Fault[];
};

const dataDir = path.join(process.cwd(), "data");
const backupsFile = path.join(dataDir, "fault-import-backups.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function readBackups(): Promise<FaultImportBackup[]> {
  await ensureDataDir();
  try {
    const content = await readFile(backupsFile, "utf8");
    const normalized = stripBom(content).trim();
    if (!normalized) {
      return [];
    }
    return JSON.parse(normalized) as FaultImportBackup[];
  } catch {
    return [];
  }
}

async function writeBackups(backups: FaultImportBackup[]) {
  await ensureDataDir();
  await writeFile(backupsFile, `${JSON.stringify(backups, null, 2)}\n`, "utf8");
}

export async function createFaultImportBackup(faults: Fault[]) {
  const backups = await readBackups();
  const backup: FaultImportBackup = {
    id: `fault-import-backup-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    itemCount: faults.length,
    faults
  };
  backups.unshift(backup);
  await writeBackups(backups.slice(0, 20));
  return backup;
}

export async function listFaultImportBackups() {
  return readBackups();
}

export async function getFaultImportBackup(backupId: string) {
  const backups = await readBackups();
  return backups.find((item) => item.id === backupId);
}
