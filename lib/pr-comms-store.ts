import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { queueDbJsonStoreWrite, readDbJsonStore } from "@/lib/db-json-store";
import { prComms as seedPrComms } from "@/lib/demo-data";
import type { PRComm } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const prCommsFile = path.join(dataDir, "pr-comms.json");
const prCommsDbKey = "pr-comms";
let prCommsCache: PRComm[] | null = null;
let prCommsHydrationStarted = false;

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

export function readPRCommsStore() {
  if (!prCommsHydrationStarted) {
    prCommsHydrationStarted = true;
    void readDbJsonStore<PRComm[]>(prCommsDbKey).then((items) => {
      if (items) {
        prCommsCache = items;
      }
    });
  }
  if (prCommsCache) {
    return prCommsCache;
  }
  return readJsonFile<PRComm[]>(prCommsFile, seedPrComms);
}

export function writePRCommsStore(items: PRComm[]) {
  prCommsCache = items;
  writeJsonFile(prCommsFile, items);
  queueDbJsonStoreWrite(prCommsDbKey, items);
}
