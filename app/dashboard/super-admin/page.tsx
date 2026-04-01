import Link from "next/link";
import { redirect } from "next/navigation";
import { GlobalSearch } from "@/components/shared/global-search";
import { SuperAdminConsole } from "@/components/super-admin/super-admin-console";
import { getSessionUser } from "@/lib/auth";
import { getSuperAdminData } from "@/lib/hub-data";
import type { GlobalSearchItem } from "@/types/domain";

export default async function SuperAdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { settings, services, controlCenter } = await getSuperAdminData();
  const activeWarnings =
    controlCenter.failures.filter((failure) => failure.severity === "warning" || failure.severity === "danger").length;
  const connectorWarnings = controlCenter.connectors.filter((connector) => connector.status !== "connected").length;
  const activeSessionCount = controlCenter.activeSessions.filter((session) => session.status === "active" || session.status === "idle").length;
  const searchItems: GlobalSearchItem[] = [
    { id: "sub-identity", title: "Identity & Access", subtitle: "Workspace and sessions", kind: "settings", href: "/dashboard/super-admin/identity-access" },
    { id: "sub-mailbox-calendar", title: "Mailbox & Calendar", subtitle: "Inbox and shared calendar", kind: "settings", href: "/dashboard/super-admin/mailbox-calendar" },
    { id: "sub-public-security", title: "Public & Security", subtitle: "Turnstile and maintenance", kind: "settings", href: "/dashboard/super-admin/public-security" },
    { id: "sub-branding", title: "Branding & Platform", subtitle: "Branding and templates", kind: "settings", href: "/dashboard/super-admin/branding-platform" },
    { id: "sub-ops", title: "Operations & Reliability", subtitle: "Services and health", kind: "settings", href: "/dashboard/super-admin/operations-reliability" },
    { id: "sub-governance", title: "Governance & Audit", subtitle: "Audit controls", kind: "settings", href: "/dashboard/super-admin/governance-audit" },
    { id: "google", title: "Google Workspace Identity", subtitle: "SSO, domains, Maps key", kind: "settings", href: "/dashboard/super-admin#settings-google-workspace" },
    { id: "mailbox", title: "Triage Mailbox", subtitle: settings.triageMailbox.address, kind: "settings", href: "/dashboard/super-admin#settings-triage-mailbox" },
    { id: "sessions", title: "Active Sessions", subtitle: `${activeSessionCount} live session(s)`, kind: "settings", href: "/dashboard/super-admin#settings-active-sessions" },
    { id: "branding", title: "Branding And Notification Policy", subtitle: settings.branding.organisationName, kind: "settings", href: "/dashboard/super-admin#settings-branding-policy" },
    { id: "telegram", title: "Telegram Integration", subtitle: settings.telegram.groupName, kind: "settings", href: "/dashboard/super-admin#settings-telegram" },
    { id: "notifications", title: "Notification Controls", subtitle: "Quiet hours, purge, policy", kind: "settings", href: "/dashboard/super-admin#settings-notification-controls" },
    { id: "comm-settings", title: "Communication Settings", subtitle: "Email and Telegram off/live/demo", kind: "settings", href: "/dashboard/super-admin/communication-settings" },
    { id: "mailbox-audit", title: "Mailbox Assignment And Status Audit", subtitle: "Readable mailbox action log", kind: "settings", href: "/dashboard/super-admin#settings-mailbox-audit" },
    { id: "maintenance", title: "Maintenance Mode", subtitle: settings.maintenance.bannerMessage, kind: "settings", href: "/dashboard/super-admin#settings-maintenance" },
    { id: "connectors", title: "Connector Health", subtitle: `${connectorWarnings} connector warning(s)`, kind: "settings", href: "/dashboard/super-admin#settings-connector-health" },
    { id: "jobs", title: "Automation Jobs", subtitle: `${controlCenter.automationJobs.length} job(s)`, kind: "settings", href: "/dashboard/super-admin#settings-automation-jobs" },
    { id: "migration-checklist", title: "Post-Migration Checklist", subtitle: "Cloud cutover actions", kind: "settings", href: "/dashboard/super-admin#settings-migration-checklist" },
    { id: "failures", title: "Error And Failure Center", subtitle: `${activeWarnings} actionable issue(s)`, kind: "settings", href: "/dashboard/super-admin#settings-error-center" },
    { id: "quality", title: "Data Quality Dashboard", subtitle: `${controlCenter.qualityMetrics.length} quality metric(s)`, kind: "settings", href: "/dashboard/super-admin#settings-data-quality" },
    { id: "usage", title: "Usage And Assistant Stats", subtitle: `${controlCenter.usageMetrics.length} usage metric(s)`, kind: "settings", href: "/dashboard/super-admin#settings-usage-stats" }
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Control identity, collaborative inbox, integrations, service operations, maintenance windows, and platform governance from one place.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} />
          <Link href="/dashboard/super-admin/communication-settings" className="button-secondary">Communication Settings</Link>
          <Link href="/dashboard/help?category=super-admin" className="button-secondary">Self Help</Link>
          <span className="button-secondary">Platform Health</span>
          <span className="button-primary">Save Policies</span>
        </div>
      </header>

      <section className="dashboard-stat-grid dashboard-stat-grid-five">
        <article className="dashboard-stat-card dashboard-stat-card-default">
          <span>Active Sessions</span>
          <strong>{activeSessionCount}</strong>
          <small>Live access across the platform</small>
        </article>
        <article className="dashboard-stat-card dashboard-stat-card-warning">
          <span>Connector Warnings</span>
          <strong>{connectorWarnings}</strong>
          <small>Need review or reauth</small>
        </article>
        <article className="dashboard-stat-card dashboard-stat-card-success">
          <span>Services</span>
          <strong>{services.length}</strong>
          <small>Tracked platform services</small>
        </article>
        <article className="dashboard-stat-card dashboard-stat-card-danger">
          <span>Failures</span>
          <strong>{activeWarnings}</strong>
          <small>Actionable issues surfaced</small>
        </article>
        <article className="dashboard-stat-card dashboard-stat-card-default">
          <span>Mailbox</span>
          <strong>{settings.triageMailbox.inboundSync === "connected" ? "Live" : "Plan"}</strong>
          <small>{settings.triageMailbox.address}</small>
        </article>
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Control Plane Snapshot</h2>
            <p>The Super Admin hub is the operational nerve center for settings, governance, quality, security, and platform health.</p>
          </div>
          <span className={`status-chip status-chip-${settings.maintenance.modeEnabled ? "warning" : "success"}`}>
            {settings.maintenance.modeEnabled ? "Maintenance Enabled" : "Platform Healthy"}
          </span>
        </div>
        <div className="meta-row">
          <Link href="/dashboard/super-admin/identity-access" className="button-secondary">Identity & Access</Link>
          <Link href="/dashboard/super-admin/mailbox-calendar" className="button-secondary">Mailbox & Calendar</Link>
          <Link href="/dashboard/super-admin/public-security" className="button-secondary">Public & Security</Link>
          <Link href="/dashboard/super-admin/branding-platform" className="button-secondary">Branding & Platform</Link>
          <Link href="/dashboard/super-admin/operations-reliability" className="button-secondary">Operations & Reliability</Link>
          <Link href="/dashboard/super-admin/governance-audit" className="button-secondary">Governance & Audit</Link>
          <span className="tag">Google Workspace: {settings.googleWorkspace.status}</span>
          <span className="tag">Telegram: {settings.telegram.status}</span>
          <span className="tag">Quiet Hours: {settings.notificationPolicy.quietHoursStart} - {settings.notificationPolicy.quietHoursEnd}</span>
          <span className="tag">Font: {settings.branding.platformFont}</span>
          <span className="tag">Updated: {new Date(settings.updatedAt).toLocaleString("en-ZA")}</span>
        </div>
      </section>

      <SuperAdminConsole initialSettings={settings} initialServices={services} initialControlCenter={controlCenter} />
    </>
  );
}
