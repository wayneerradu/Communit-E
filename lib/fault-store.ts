import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { faultNotes as seedFaultNotes, faults as seedFaults } from "@/lib/demo-data";
import type { Fault, FaultNote } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const faultsFile = path.join(dataDir, "faults.json");
const faultNotesFile = path.join(dataDir, "fault-notes.json");

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
  return readJsonFile<Fault[]>(faultsFile, seedFaults);
}

export function writeFaultsStore(items: Fault[]) {
  writeJsonFile(faultsFile, items);
}

export function readFaultNotesStore() {
  return readJsonFile<FaultNote[]>(faultNotesFile, seedFaultNotes);
}

export function writeFaultNotesStore(items: FaultNote[]) {
  writeJsonFile(faultNotesFile, items);
}
