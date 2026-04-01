import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { residentHistory as seedResidentHistory, residents as seedResidents } from "@/lib/demo-data";
import type { Resident, ResidentHistoryItem } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const residentsFile = path.join(dataDir, "residents.json");
const residentHistoryFile = path.join(dataDir, "resident-history.json");

function ensureResidentStoreFile<T>(filePath: string, seedData: T) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${JSON.stringify(seedData, null, 2)}\n`, "utf8");
  }
}

function readJsonFile<T>(filePath: string, seedData: T): T {
  ensureResidentStoreFile(filePath, seedData);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureResidentStoreFile(filePath, value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readResidentsStore() {
  return readJsonFile<Resident[]>(residentsFile, seedResidents);
}

export function writeResidentsStore(residents: Resident[]) {
  writeJsonFile(residentsFile, residents);
}

export function readResidentHistoryStore() {
  return readJsonFile<ResidentHistoryItem[]>(residentHistoryFile, seedResidentHistory);
}

export function writeResidentHistoryStore(history: ResidentHistoryItem[]) {
  writeJsonFile(residentHistoryFile, history);
}
