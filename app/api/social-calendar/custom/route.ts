import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readCustomSocialCalendarItems, writeCustomSocialCalendarItems } from "@/lib/social-calendar-custom-store";
import type { SocialCalendarItem } from "@/types/domain";

const customHolidaySchema = z.object({
  holidayName: z.string().min(2),
  date: z.string().min(8),
  category: z.enum(["International Holiday", "Important Observation Day"]),
  description: z.string().min(4)
});

function getDateLine(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return `${date.toLocaleDateString("en-ZA", { weekday: "long" })} · ${date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}`;
}

export async function GET() {
  const items = await readCustomSocialCalendarItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const payload = customHolidaySchema.parse(await request.json());
    const items = await readCustomSocialCalendarItems();
    const nextItem: SocialCalendarItem = {
      id: `custom-holiday-${randomUUID()}`,
      holidayName: payload.holidayName,
      date: payload.date,
      category: payload.category,
      postPlan: `${getDateLine(payload.date)}|||${payload.description}`
    };

    items.unshift(nextItem);
    await writeCustomSocialCalendarItems(items);

    return NextResponse.json({ item: nextItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save custom holiday." },
      { status: 400 }
    );
  }
}
