import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { meetingMinutes as seedMeetingMinutes } from "@/lib/demo-data";
import type { MeetingMinute } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const meetingsFile = path.join(dataDir, "meeting-minutes.json");

function ensureMeetingStoreFile<T>(filePath: string, seedData: T) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${JSON.stringify(seedData, null, 2)}\n`, "utf8");
  }
}

function readJsonFile<T>(filePath: string, seedData: T): T {
  ensureMeetingStoreFile(filePath, seedData);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureMeetingStoreFile(filePath, value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readMeetingMinutesStore() {
  return readJsonFile<MeetingMinute[]>(meetingsFile, seedMeetingMinutes);
}

export function writeMeetingMinutesStore(minutes: MeetingMinute[]) {
  writeJsonFile(meetingsFile, minutes);
}
