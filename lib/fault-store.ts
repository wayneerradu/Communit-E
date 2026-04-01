import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { queueDbJsonStoreWrite, readDbJsonStore } from "@/lib/db-json-store";
import { faultNotes as seedFaultNotes, faults as seedFaults } from "@/lib/demo-data";
import type { Fault, FaultNote } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const faultsFile = path.join(dataDir, "faults.json");
const faultNotesFile = path.join(dataDir, "fault-notes.json");
const faultsDbKey = "faults";
const faultNotesDbKey = "fault-notes";
let faultsCache: Fault[] | null = null;
let faultNotesCache: FaultNote[] | null = null;
let faultsHydrationStarted = false;
let faultNotesHydrationStarted = false;

function ensureStoreFile<T>(filePath: string, seedData: T) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${JSON.stringify(seedData, null, 2)}\n`, "utf8");
  }
}

function readJsonFile<T>(filePath: string, seedData: T): T {
  ensureStoreFile(filePath, seedData);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureStoreFile(filePath, value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readFaultsStore() {
  if (!faultsHydrationStarted) {
    faultsHydrationStarted = true;
    void readDbJsonStore<Fault[]>(faultsDbKey).then((items) => {
      if (items) {
        faultsCache = items;
      }
    });
  }

  if (faultsCache) {
    return faultsCache;
  }

  return readJsonFile<Fault[]>(faultsFile, seedFaults);
}

export function writeFaultsStore(items: Fault[]) {
  faultsCache = items;
  writeJsonFile(faultsFile, items);
  queueDbJsonStoreWrite(faultsDbKey, items);
}

export function readFaultNotesStore() {
  if (!faultNotesHydrationStarted) {
    faultNotesHydrationStarted = true;
    void readDbJsonStore<FaultNote[]>(faultNotesDbKey).then((items) => {
      if (items) {
        faultNotesCache = items;
      }
    });
  }

  if (faultNotesCache) {
    return faultNotesCache;
  }

  return readJsonFile<FaultNote[]>(faultNotesFile, seedFaultNotes);
}

export function writeFaultNotesStore(items: FaultNote[]) {
  faultNotesCache = items;
  writeJsonFile(faultNotesFile, items);
  queueDbJsonStoreWrite(faultNotesDbKey, items);
}
