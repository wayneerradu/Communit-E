import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createGoogleCalendarEvent, listSharedGoogleCalendarEvents } from "@/lib/google-calendar";

type CalendarView = "month" | "week" | "day";

function parseCalendarView(value: string | null): CalendarView {
  if (value === "week" || value === "day") return value;
  return "month";
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+02:00`);
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const view = parseCalendarView(url.searchParams.get("view"));
    const anchor = url.searchParams.get("anchor") ?? undefined;
    const items = await listSharedGoogleCalendarEvents(view, anchor);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read shared calendar." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      title?: string;
      description?: string;
      location?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      requiredAttendees?: string[];
      optionalAttendees?: string[];
      sendInvites?: boolean;
    };

    const title = (payload.title ?? "").trim();
    const date = (payload.date ?? "").trim();
    const startTime = (payload.startTime ?? "").trim();
    const endTime = (payload.endTime ?? "").trim();

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "Title, date, start time, and end time are required." }, { status: 400 });
    }

    const start = buildDateTime(date, startTime);
    const end = buildDateTime(date, endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Please provide a valid time range." }, { status: 400 });
    }

    const event = await createGoogleCalendarEvent({
      title,
      description: payload.description?.trim() ?? "",
      location: payload.location?.trim() ?? "",
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      requiredAttendees: payload.requiredAttendees ?? [],
      optionalAttendees: payload.optionalAttendees ?? [],
      sendInvites: payload.sendInvites
    });

    return NextResponse.json({
      ok: true,
      message: "Event added to the shared calendar.",
      item: event
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create shared calendar event." },
      { status: 500 }
    );
  }
}
