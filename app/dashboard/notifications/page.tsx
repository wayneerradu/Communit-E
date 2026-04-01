import { getSessionUser } from "@/lib/auth";
import { NotificationsCenterConsole } from "@/components/notifications/notifications-center-console";
import { listVisibleAdminNotifications } from "@/lib/notification-store";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  const notifications = await listVisibleAdminNotifications(user?.email ?? "");

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Notification Center</h1>
          <p>Track shared in-app alerts, delegate changes, and Telegram-linked operational updates in one place.</p>
        </div>
      </header>
      <NotificationsCenterConsole initialNotifications={notifications} currentUserEmail={user?.email ?? ""} />
    </>
  );
}
