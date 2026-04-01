import { readPlatformSettings, updatePlatformSettings } from "@/lib/platform-store";
import { readGoogleCalendarConnection, writeGoogleCalendarConnection } from "@/lib/google-calendar-store";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export type DashboardCalendarItem = {
  id: string;
  label: string;
  href: string;
};

export type PlannerCalendarItem = {
  id: string;
  title: string;
  dateLabel: string;
  href: string;
  location?: string;
};

export type SharedCalendarView = "month" | "week" | "day";

export type SharedCalendarEventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  href?: string;
  isAllDay: boolean;
};

export type GoogleCalendarCreateEventInput = {
  title: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  requiredAttendees: string[];
  optionalAttendees?: string[];
  sendInvites?: boolean;
};

export type GoogleCalendarCreateAllDayEventInput = {
  title: string;
  description: string;
  location?: string;
  date: string;
  requiredAttendees: string[];
  optionalAttendees?: string[];
  sendInvites?: boolean;
};

export type GoogleCalendarPlannerSyncItem = {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
};

function getEventStartValue(event: GoogleCalendarEvent) {
  return event.start?.dateTime ?? event.start?.date ?? "";
}

function formatCalendarEventLabel(event: GoogleCalendarEvent) {
  const startValue = getEventStartValue(event);
  const summary = event.summary?.trim() || "Calendar event";

  if (!startValue) {
    return summary;
  }

  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) {
    return summary;
  }

  const timeLabel = startValue.includes("T")
    ? startDate.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
    : "All day";

  return `${timeLabel} ${summary}`;
}

async function refreshGoogleCalendarAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error("Unable to refresh Google Calendar access token.");
  }

  return (await response.json()) as { access_token?: string; expires_in?: number };
}

async function getValidGoogleCalendarAccessToken() {
  const connection = await readGoogleCalendarConnection();
  if (!connection) {
    return null;
  }

  const expiresAt = new Date(connection.expiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000) {
    return connection.accessToken;
  }

  const refreshed = await refreshGoogleCalendarAccessToken(connection.refreshToken);
  if (!refreshed.access_token) {
    return null;
  }

  const nextConnection = {
    ...connection,
    accessToken: refreshed.access_token,
    expiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
  };

  await writeGoogleCalendarConnection(nextConnection);
  return nextConnection.accessToken;
}

async function listGoogleCalendarEventsInRange(timeMin: string, timeMax: string) {
  const settings = await readPlatformSettings();
  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId) {
    return [];
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    return [];
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    timeMin,
    timeMax
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return payload.items ?? [];
}

function toIsoOrEmpty(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export async function listSharedGoogleCalendarEvents(view: SharedCalendarView, anchor?: string): Promise<SharedCalendarEventItem[]> {
  const base = anchor ? new Date(anchor) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid calendar anchor date.");
  }

  const rangeStart = new Date(base);
  const rangeEnd = new Date(base);

  if (view === "day") {
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (view === "week") {
    const day = rangeStart.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    rangeStart.setDate(rangeStart.getDate() + offset);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setDate(rangeEnd.getDate() + 6);
    rangeEnd.setHours(23, 59, 59, 999);
  } else {
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setMonth(rangeStart.getMonth() + 1, 0);
    rangeEnd.setHours(23, 59, 59, 999);
  }

  const events = await listGoogleCalendarEventsInRange(rangeStart.toISOString(), rangeEnd.toISOString());
  return events.map((event) => {
    const startRaw = event.start?.dateTime ?? event.start?.date ?? "";
    const endRaw = event.end?.dateTime ?? event.end?.date ?? "";
    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
    return {
      id: event.id,
      title: event.summary?.trim() || "Calendar event",
      start: toIsoOrEmpty(startRaw),
      end: toIsoOrEmpty(endRaw),
      location: event.location?.trim() || undefined,
      description: event.description?.trim() || undefined,
      href: event.htmlLink ?? undefined,
      isAllDay
    };
  });
}

export async function createGoogleCalendarEvent(input: GoogleCalendarCreateEventInput) {
  const settings = await readPlatformSettings();

  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId) {
    throw new Error("Google Calendar sync is not enabled or the calendar ID is missing.");
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?sendUpdates=${
      input.sendInvites === false ? "none" : "all"
    }`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.startDateTime,
          timeZone: "Africa/Johannesburg"
        },
        end: {
          dateTime: input.endDateTime,
          timeZone: "Africa/Johannesburg"
        },
        attendees: [
          ...input.requiredAttendees.map((email) => ({ email, optional: false })),
          ...(input.optionalAttendees ?? []).map((email) => ({ email, optional: true }))
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error("Unable to create the Google Calendar event.");
  }

  const payload = (await response.json()) as {
    id?: string;
    htmlLink?: string;
    organizer?: { email?: string };
  };

  await updatePlatformSettings((current) => ({
    ...current,
    googleCalendar: {
      ...current.googleCalendar,
      connectedAccount: payload.organizer?.email ?? current.googleCalendar.connectedAccount,
      lastSyncedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));

  return {
    id: payload.id,
    htmlLink: payload.htmlLink,
    organizerEmail: payload.organizer?.email ?? settings.googleCalendar.connectedAccount
  };
}

export async function createGoogleCalendarAllDayEvent(input: GoogleCalendarCreateAllDayEventInput) {
  const settings = await readPlatformSettings();

  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId) {
    throw new Error("Google Calendar sync is not enabled or the calendar ID is missing.");
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const nextDay = new Date(`${input.date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDate = nextDay.toISOString().slice(0, 10);

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?sendUpdates=${
      input.sendInvites === false ? "none" : "all"
    }`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        location: input.location ?? "",
        start: {
          date: input.date
        },
        end: {
          date: endDate
        },
        attendees: [
          ...input.requiredAttendees.map((email) => ({ email, optional: false })),
          ...(input.optionalAttendees ?? []).map((email) => ({ email, optional: true }))
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error("Unable to create the Google Calendar event.");
  }

  const payload = (await response.json()) as {
    id?: string;
    htmlLink?: string;
    organizer?: { email?: string };
  };

  await updatePlatformSettings((current) => ({
    ...current,
    googleCalendar: {
      ...current.googleCalendar,
      connectedAccount: payload.organizer?.email ?? current.googleCalendar.connectedAccount,
      lastSyncedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));

  return {
    id: payload.id,
    htmlLink: payload.htmlLink,
    organizerEmail: payload.organizer?.email ?? settings.googleCalendar.connectedAccount
  };
}

export async function syncPlannerItemsToGoogleCalendar(items: GoogleCalendarPlannerSyncItem[]) {
  const settings = await readPlatformSettings();

  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId || items.length === 0) {
    return;
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    return;
  }

  const year = Number(items[0]?.date.slice(0, 4));
  if (!Number.isFinite(year)) {
    return;
  }

  const existingEvents = await listGoogleCalendarEventsInRange(
    `${year}-01-01T00:00:00.000Z`,
    `${year + 1}-01-01T00:00:00.000Z`
  );
  const existingByPlannerId = new Map(
    existingEvents
      .map((event) => [event.extendedProperties?.private?.communitePlannerId, event] as const)
      .filter((entry): entry is [string, GoogleCalendarEvent] => Boolean(entry[0]))
  );

  for (const item of items) {
    const existing = existingByPlannerId.get(item.id);
    const body = {
      summary: item.title,
      description: `${item.category}\n\n${item.description}`,
      start: { date: item.date },
      end: { date: item.date },
      extendedProperties: {
        private: {
          communitePlannerId: item.id,
          communitePlannerCategory: item.category
        }
      }
    };

    if (existing?.id) {
      await fetch(
        `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events/${encodeURIComponent(existing.id)}?sendUpdates=none`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );
      continue;
    }

    await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?sendUpdates=none`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
  }

  await updatePlatformSettings((current) => ({
    ...current,
    googleCalendar: {
      ...current.googleCalendar,
      lastSyncedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));
}

export async function syncGoogleCalendarDashboardItems(): Promise<DashboardCalendarItem[]> {
  const settings = await readPlatformSettings();

  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId) {
    return [];
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    return [];
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "5",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString()
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  const items = payload.items ?? [];

  await updatePlatformSettings((current) => ({
    ...current,
    googleCalendar: {
      ...current.googleCalendar,
      lastSyncedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));

  return items.map((event) => ({
    id: event.id,
    label: formatCalendarEventLabel(event),
    href: event.htmlLink ?? "/dashboard/super-admin"
  }));
}

export async function syncGoogleCalendarPlannerItems(): Promise<PlannerCalendarItem[]> {
  const settings = await readPlatformSettings();

  if (!settings.googleCalendar.enabled || !settings.googleCalendar.calendarId) {
    return [];
  }

  const accessToken = await getValidGoogleCalendarAccessToken();
  if (!accessToken) {
    return [];
  }

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "25",
    timeMin: new Date().toISOString()
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(settings.googleCalendar.calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  const items = payload.items ?? [];

  await updatePlatformSettings((current) => ({
    ...current,
    googleCalendar: {
      ...current.googleCalendar,
      lastSyncedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  }));

  return items.map((event) => {
    const startValue = getEventStartValue(event);
    const startDate = startValue ? new Date(startValue) : null;
    const dateLabel =
      startDate && !Number.isNaN(startDate.getTime())
        ? startValue.includes("T")
          ? startDate.toLocaleString("en-ZA", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
          : startDate.toLocaleDateString("en-ZA", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric"
            })
        : "Date pending";

    return {
      id: event.id,
      title: event.summary?.trim() || "Calendar event",
      dateLabel,
      href: event.htmlLink ?? "/dashboard/super-admin",
      location: event.location?.trim() || undefined
    };
  });
}
