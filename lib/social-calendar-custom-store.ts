import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SocialCalendarItem } from "@/types/domain";

const SOCIAL_CALENDAR_CUSTOM_PATH = path.join(process.cwd(), "data", "social-calendar-custom.json");

export async function readCustomSocialCalendarItems(): Promise<SocialCalendarItem[]> {
  try {
    const raw = await readFile(SOCIAL_CALENDAR_CUSTOM_PATH, "utf8");
    return JSON.parse(raw) as SocialCalendarItem[];
  } catch {
    return [];
  }
}

export async function writeCustomSocialCalendarItems(items: SocialCalendarItem[]) {
  await mkdir(path.dirname(SOCIAL_CALENDAR_CUSTOM_PATH), { recursive: true });
  await writeFile(SOCIAL_CALENDAR_CUSTOM_PATH, JSON.stringify(items, null, 2), "utf8");
}
