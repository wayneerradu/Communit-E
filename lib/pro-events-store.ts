import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProEventCampaignItem } from "@/types/domain";

const dataDirectory = path.join(process.cwd(), "data");
const eventsFilePath = path.join(dataDirectory, "pro-events-campaigns.json");

async function ensureDataDirectory() {
  await mkdir(dataDirectory, { recursive: true });
}

export async function readProEventCampaignStore(): Promise<ProEventCampaignItem[]> {
  await ensureDataDirectory();

  try {
    const raw = await readFile(eventsFilePath, "utf-8");
    const items = JSON.parse(raw) as Array<Partial<ProEventCampaignItem>>;
    return items.map((item, index) => ({
      id: item.id ?? `event-campaign-legacy-${index}`,
      name: item.name ?? "Untitled Event",
      plannedDate: item.plannedDate ?? new Date().toISOString().slice(0, 10),
      description: item.description ?? "",
      plan: item.plan ?? "",
      createdAt: item.createdAt ?? new Date().toISOString(),
      status: item.status ?? "pending-approval",
      approvers: item.approvers ?? [],
      appCount: item.appCount ?? item.approvers?.length ?? 0,
      createdByEmail: item.createdByEmail,
      createdByName: item.createdByName,
      calendarEventId: item.calendarEventId,
      calendarEventLink: item.calendarEventLink
    }));
  } catch {
    return [];
  }
}

export async function writeProEventCampaignStore(items: ProEventCampaignItem[]): Promise<void> {
  await ensureDataDirectory();
  await writeFile(eventsFilePath, JSON.stringify(items, null, 2), "utf-8");
}
