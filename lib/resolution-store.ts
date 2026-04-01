import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolutions as seedResolutions } from "@/lib/demo-data";
import type { Resolution } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const resolutionsFile = path.join(dataDir, "resolutions.json");

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

export function readResolutionsStore() {
  return readJsonFile<Resolution[]>(resolutionsFile, seedResolutions);
}

export function writeResolutionsStore(items: Resolution[]) {
  writeJsonFile(resolutionsFile, items);
}
