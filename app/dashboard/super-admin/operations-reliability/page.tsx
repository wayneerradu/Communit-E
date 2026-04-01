import Link from "next/link";
import { redirect } from "next/navigation";
import { SuperAdminConsole } from "@/components/super-admin/super-admin-console";
import { getSessionUser } from "@/lib/auth";
import { getSuperAdminData } from "@/lib/hub-data";

export default async function SuperAdminOperationsReliabilityPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { settings, services, controlCenter } = await getSuperAdminData();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings · Operations & Reliability</h1>
          <p>Run service operations, connector monitoring, automation jobs, and reliability tracking.</p>
        </div>
        <div className="dashboard-actions">
          <Link href="/dashboard/super-admin" className="button-secondary">Back to Settings</Link>
          <Link href="/dashboard/help?category=super-admin&q=Operations%20and%20Reliability" className="button-secondary">Self Help</Link>
        </div>
      </header>
      <SuperAdminConsole
        initialSettings={settings}
        initialServices={services}
        initialControlCenter={controlCenter}
        initialSection="operations-reliability"
      />
    </>
  );
}
