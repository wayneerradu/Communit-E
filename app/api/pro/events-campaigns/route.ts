import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { readProEventCampaignStore, writeProEventCampaignStore } from "@/lib/pro-events-store";
import type { ProEventCampaignItem } from "@/types/domain";

const eventCampaignSchema = z.object({
  name: z.string().min(2),
  plannedDate: z.string().min(8),
  description: z.string().min(4),
  plan: z.string().min(4)
});

export async function GET() {
  const items = await readProEventCampaignStore();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const payload = eventCampaignSchema.parse(await request.json());
    const user = await getSessionUser();
    const items = await readProEventCampaignStore();
    const nextItem: ProEventCampaignItem = {
      id: `event-campaign-${randomUUID()}`,
      name: payload.name,
      plannedDate: payload.plannedDate,
      description: payload.description,
      plan: payload.plan,
      createdAt: new Date().toISOString(),
      status: "pending-approval",
      approvers: [],
      appCount: 0,
      createdByEmail: user?.email,
      createdByName: user?.name
    };

    items.unshift(nextItem);
    await writeProEventCampaignStore(items);

    return NextResponse.json({ item: nextItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save event or campaign." },
      { status: 400 }
    );
  }
}
