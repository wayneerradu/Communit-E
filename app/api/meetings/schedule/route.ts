import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { queueConnectorFailureTelegramAlert } from "@/lib/telegram-critical-alerts";
import { createScheduledMeeting } from "@/lib/workflows";

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+02:00`);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in to schedule a meeting." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const start = buildDateTime(payload.meetingDate, payload.startTime);
    const end = buildDateTime(payload.meetingDate, payload.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Please provide a valid meeting date and time." }, { status: 400 });
    }

    if (end.getTime() <= start.getTime()) {
      return NextResponse.json({ error: "End time must be later than the start time." }, { status: 400 });
    }

    const calendarEvent = await createGoogleCalendarEvent({
      title: payload.title,
      description: payload.agenda,
      location: payload.location,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      requiredAttendees: payload.requiredAttendees ?? [],
      optionalAttendees: payload.optionalAttendees ?? [],
      sendInvites: payload.sendInvites
    });

    const item = createScheduledMeeting({
      ...payload,
      organizerEmail: calendarEvent.organizerEmail ?? user.email,
      googleEventId: calendarEvent.id,
      calendarEventLink: calendarEvent.htmlLink
    });

    return NextResponse.json(
      {
        item,
        message: "Meeting scheduled and written to the shared calendar."
      },
      { status: 201 }
    );
  } catch (error) {
    await queueConnectorFailureTelegramAlert(
      "calendar",
      error instanceof Error ? error.message : "Unable to schedule meeting in shared calendar."
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to schedule the meeting."
      },
      { status: 400 }
    );
  }
}
