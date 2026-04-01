import Link from "next/link";
import { redirect } from "next/navigation";
import { GlobalSearch } from "@/components/shared/global-search";
import { CommunicationSettingsConsole } from "@/components/super-admin/communication-settings-console";
import { getSessionUser } from "@/lib/auth";
import { readPlatformSettings } from "@/lib/platform-store";
import type { GlobalSearchItem } from "@/types/domain";

export default async function CommunicationSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const settings = await readPlatformSettings();
  const searchItems: GlobalSearchItem[] = [
    {
      id: "comm-email",
      title: "Email Modes",
      subtitle: "Off, Live, Demo",
      kind: "settings",
      href: "/dashboard/super-admin/communication-settings#email"
    },
    {
      id: "comm-telegram",
      title: "Telegram Modes",
      subtitle: "Off, Live, Demo",
      kind: "settings",
      href: "/dashboard/super-admin/communication-settings#telegram"
    }
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Communication Settings</h1>
          <p>Super Admin controls for safe notification rollout using Off, Demo, and Live modes.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} />
          <Link href="/dashboard/super-admin" className="button-secondary">Back to Settings</Link>
          <Link href="/dashboard/help?category=super-admin&q=Communication%20Settings" className="button-secondary">Self Help</Link>
        </div>
      </header>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Mode Guardrails</h2>
            <p>Keep channels in Demo while validating workflows, then switch to Live when approved.</p>
          </div>
          <span className="status-chip status-chip-default">Super Admin Only</span>
        </div>
        <div className="meta-row">
          <span className="tag">Email: {settings.communicationSettings.email.mode.toUpperCase()}</span>
          <span className="tag">Telegram: {settings.communicationSettings.telegram.mode.toUpperCase()}</span>
          <span className="tag">Updated: {new Date(settings.updatedAt).toLocaleString("en-ZA")}</span>
        </div>
      </section>

      <CommunicationSettingsConsole initialSettings={settings} />
    </>
  );
}
