import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { listVisibleAdminNotifications, markAdminNotificationsRead, processNotificationDeliveryQueue } from "@/lib/notification-store";
import { syncMailboxNotifications } from "@/lib/mailbox-notifications";
import { runTelegramCriticalAlertSweep } from "@/lib/telegram-critical-alerts";

const schema = z.object({
  action: z.enum(["mark-all-read", "mark-read"]),
  notificationIds: z.array(z.string()).optional()
});

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncMailboxNotifications();
  await runTelegramCriticalAlertSweep();
  await processNotificationDeliveryQueue();
  const notifications = await listVisibleAdminNotifications(user.email);
  const normalizedEmail = user.email.trim().toLowerCase();

  return NextResponse.json({
    items: notifications,
    unreadCount: notifications.filter((item) => !(item.readBy ?? []).includes(normalizedEmail)).length
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = schema.parse(await request.json());
  await (
    payload.action === "mark-all-read"
      ? await markAdminNotificationsRead(user.email)
      : await markAdminNotificationsRead(user.email, payload.notificationIds)
  );
  const notifications = await listVisibleAdminNotifications(user.email);
  const normalizedEmail = user.email.trim().toLowerCase();

  return NextResponse.json({
    items: notifications,
    unreadCount: notifications.filter((item) => !(item.readBy ?? []).includes(normalizedEmail)).length
  });
}
