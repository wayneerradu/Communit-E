import Link from "next/link";
import { redirect } from "next/navigation";
import { SuperAdminConsole } from "@/components/super-admin/super-admin-console";
import { getSessionUser } from "@/lib/auth";
import { getSuperAdminData } from "@/lib/hub-data";

export default async function SuperAdminMailboxCalendarPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { settings, services, controlCenter } = await getSuperAdminData();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings · Mailbox & Calendar</h1>
          <p>Configure Hello Inbox and shared calendar connection, scopes, and sync controls.</p>
        </div>
        <div className="dashboard-actions">
          <Link href="/dashboard/super-admin" className="button-secondary">Back to Settings</Link>
          <Link href="/dashboard/help?category=super-admin&q=Mailbox%20and%20Calendar" className="button-secondary">Self Help</Link>
        </div>
      </header>
      <SuperAdminConsole
        initialSettings={settings}
        initialServices={services}
        initialControlCenter={controlCenter}
        initialSection="mailbox-calendar"
      />
    </>
  );
}
