import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parkingLotIdeas as seedParkingLotIdeas } from "@/lib/demo-data";
import type { ParkingLotIdea } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const parkingLotFile = path.join(dataDir, "parking-lot-ideas.json");

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

export function readParkingLotStore() {
  return readJsonFile<ParkingLotIdea[]>(parkingLotFile, seedParkingLotIdeas);
}

export function writeParkingLotStore(items: ParkingLotIdea[]) {
  writeJsonFile(parkingLotFile, items);
}
