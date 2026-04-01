import { getMailboxActionsByMessageIds } from "@/lib/mailbox-action-store";
import { addAdminNotifications, listAdminNotifications } from "@/lib/notification-store";
import { listGoogleMailboxMessages } from "@/lib/google-mailbox";
import type { AppNotification } from "@/types/domain";

export async function syncMailboxNotifications() {
  try {
    const latest = await listGoogleMailboxMessages(15, "in:inbox newer_than:7d");
    const actions = await getMailboxActionsByMessageIds(latest.map((item) => item.id));
    const existing = await listAdminNotifications();
    const existingIds = new Set(existing.map((item) => item.id));
    const notifications: AppNotification[] = latest
      .filter((item) => item.unread)
      .filter((item) => actions.get(item.id)?.workflowStatus !== "to-be-deleted")
      .filter((item) => !existingIds.has(`mailbox-${item.id}`))
      .map((item) => ({
        id: `mailbox-${item.id}`,
        title: `New Email: ${item.subject || "(No subject)"}`,
        detail: `From ${item.from} • ${item.snippet || "Open Hello Inbox to view this message."}`,
        channel: "in-app",
        audience: "admins",
        createdAt: new Date().toISOString(),
        importance: "informational",
        tone: "default",
        readBy: []
      }));

    if (notifications.length > 0) {
      await addAdminNotifications(notifications);
    }
  } catch {
    // Mailbox sync should never block core notifications.
  }
}
