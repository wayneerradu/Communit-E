import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createGoogleCalendarAllDayEvent } from "@/lib/google-calendar";
import { getConfiguredWorkspaceUsers } from "@/lib/identity";
import { readProEventCampaignStore, writeProEventCampaignStore } from "@/lib/pro-events-store";

const REQUIRED_APPROVALS = 5;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to approve an event or campaign." }, { status: 401 });
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only admins can approve an event or campaign." }, { status: 403 });
  }

  const { id } = await context.params;
  const items = await readProEventCampaignStore();
  const target = items.find((item) => item.id === id);

  if (!target) {
    return NextResponse.json({ error: "Event or campaign not found." }, { status: 404 });
  }

  if (target.createdByEmail?.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot approve your own event or campaign." }, { status: 400 });
  }

  if (target.status === "approved") {
    return NextResponse.json({ item: target });
  }

  const normalizedApprover = user.email.toLowerCase();
  const nextApprovers = Array.from(new Set([...target.approvers.map((entry) => entry.toLowerCase()), normalizedApprover]));
  const isApproved = nextApprovers.length >= REQUIRED_APPROVALS;

  const nextItems = items.map((item) =>
    item.id === id
      ? {
          ...item,
          approvers: nextApprovers,
          appCount: nextApprovers.length,
          status: isApproved ? "approved" as const : "pending-approval" as const
        }
      : item
  );

  let approvedItem = nextItems.find((item) => item.id === id)!;

  if (isApproved && !approvedItem.calendarEventId) {
    const adminAttendees = getConfiguredWorkspaceUsers()
      .filter((entry) => entry.role === "ADMIN" || entry.role === "SUPER_ADMIN")
      .map((entry) => entry.email);

    const calendarEvent = await createGoogleCalendarAllDayEvent({
      title: approvedItem.name,
      description: `${approvedItem.description}\n\nWhat is the plan\n${approvedItem.plan}`,
      date: approvedItem.plannedDate,
      requiredAttendees: adminAttendees,
      sendInvites: true
    });

    const syncedItems = nextItems.map((item) =>
      item.id === id
        ? {
            ...item,
            calendarEventId: calendarEvent.id,
            calendarEventLink: calendarEvent.htmlLink
          }
        : item
    );

    await writeProEventCampaignStore(syncedItems);
    approvedItem = syncedItems.find((item) => item.id === id)!;
    return NextResponse.json({ item: approvedItem });
  }

  await writeProEventCampaignStore(nextItems);
  return NextResponse.json({ item: approvedItem });
}
