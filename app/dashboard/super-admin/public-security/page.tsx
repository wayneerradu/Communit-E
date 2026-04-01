import Link from "next/link";
import { redirect } from "next/navigation";
import { SuperAdminConsole } from "@/components/super-admin/super-admin-console";
import { getSessionUser } from "@/lib/auth";
import { getSuperAdminData } from "@/lib/hub-data";

export default async function SuperAdminPublicSecurityPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { settings, services, controlCenter } = await getSuperAdminData();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings · Public & Security</h1>
          <p>Control public surface protections, maintenance mode, and external exposure safeguards.</p>
        </div>
        <div className="dashboard-actions">
          <Link href="/dashboard/super-admin" className="button-secondary">Back to Settings</Link>
          <Link href="/dashboard/help?category=super-admin&q=Public%20and%20Security" className="button-secondary">Self Help</Link>
        </div>
      </header>
      <SuperAdminConsole
        initialSettings={settings}
        initialServices={services}
        initialControlCenter={controlCenter}
        initialSection="public-security"
      />
    </>
  );
}
