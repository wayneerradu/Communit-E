import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { queueDbJsonStoreWrite, readDbJsonStore } from "@/lib/db-json-store";
import { residentHistory as seedResidentHistory, residents as seedResidents } from "@/lib/demo-data";
import type { Resident, ResidentHistoryItem } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const residentsFile = path.join(dataDir, "residents.json");
const residentHistoryFile = path.join(dataDir, "resident-history.json");
const residentsDbKey = "residents";
const residentHistoryDbKey = "resident-history";
let residentsCache: Resident[] | null = null;
let residentHistoryCache: ResidentHistoryItem[] | null = null;
let residentsHydrationStarted = false;
let residentHistoryHydrationStarted = false;

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
  if (!residentsHydrationStarted) {
    residentsHydrationStarted = true;
    void readDbJsonStore<Resident[]>(residentsDbKey).then((items) => {
      if (items) {
        residentsCache = items;
      }
    });
  }
  if (residentsCache) {
    return residentsCache;
  }
  return readJsonFile<Resident[]>(residentsFile, seedResidents);
}

export function writeResidentsStore(residents: Resident[]) {
  residentsCache = residents;
  writeJsonFile(residentsFile, residents);
  queueDbJsonStoreWrite(residentsDbKey, residents);
}

export function readResidentHistoryStore() {
  if (!residentHistoryHydrationStarted) {
    residentHistoryHydrationStarted = true;
    void readDbJsonStore<ResidentHistoryItem[]>(residentHistoryDbKey).then((items) => {
      if (items) {
        residentHistoryCache = items;
      }
    });
  }
  if (residentHistoryCache) {
    return residentHistoryCache;
  }
  return readJsonFile<ResidentHistoryItem[]>(residentHistoryFile, seedResidentHistory);
}

export function writeResidentHistoryStore(history: ResidentHistoryItem[]) {
  residentHistoryCache = history;
  writeJsonFile(residentHistoryFile, history);
  queueDbJsonStoreWrite(residentHistoryDbKey, history);
}
