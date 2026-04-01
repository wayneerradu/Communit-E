import { redirect } from "next/navigation";
import { FaultSettingsConsole } from "@/components/faults/fault-settings-console";
import { getSessionUser } from "@/lib/auth";
import { getSuperAdminData } from "@/lib/hub-data";

export default async function FaultSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard/faults");
  }

  const { settings } = await getSuperAdminData();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Fault Settings</h1>
          <p>Superadmin escalation contact configuration used by Faults Hub workflow automation.</p>
        </div>
      </header>
      <FaultSettingsConsole initialFaultEscalation={settings.faultEscalation} />
    </>
  );
}
