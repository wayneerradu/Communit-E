"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import type { PlatformControlCenter, PlatformService, PlatformSettings } from "@/types/domain";

type Props = {
  initialSettings: PlatformSettings;
  initialServices: PlatformService[];
  initialControlCenter: PlatformControlCenter;
  initialSection?:
    | "identity-access"
    | "mailbox-calendar"
    | "public-security"
    | "branding-platform"
    | "operations-reliability"
    | "governance-audit"
    | "all";
};

type ActionState = {
  tone: "default" | "success" | "warning";
  message: string;
} | null;

type MailboxAuditEntry = {
  id: string;
  messageId: string;
  eventType: "read" | "action" | "assignment" | "status";
  actorEmail: string;
  actorName: string;
  detail: string;
  createdAt: string;
};

type SettingsSection =
  | "identity-access"
  | "mailbox-calendar"
  | "public-security"
  | "branding-platform"
  | "operations-reliability"
  | "governance-audit"
  | "all";

const settingsSectionOptions: Array<{ id: SettingsSection; label: string }> = [
  { id: "identity-access", label: "Identity & Access" },
  { id: "mailbox-calendar", label: "Mailbox & Calendar" },
  { id: "public-security", label: "Public & Security" },
  { id: "branding-platform", label: "Branding & Platform" },
  { id: "operations-reliability", label: "Operations & Reliability" },
  { id: "governance-audit", label: "Governance & Audit" },
  { id: "all", label: "Show All" }
];

export function SuperAdminConsole({
  initialSettings,
  initialServices,
  initialControlCenter,
  initialSection = "identity-access"
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [services, setServices] = useState(initialServices);
  const [controlCenter] = useState(initialControlCenter);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();
  const [showGoogleMapsApiKey, setShowGoogleMapsApiKey] = useState(false);
  const [showTurnstileSiteKey, setShowTurnstileSiteKey] = useState(false);
  const [mailboxAuditEntries, setMailboxAuditEntries] = useState<MailboxAuditEntry[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  function isSectionVisible(...sections: SettingsSection[]) {
    return activeSection === "all" || sections.includes(activeSection);
  }

  async function postJson<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }

    return payload as T;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/super-admin/operations/mailbox-audit", { cache: "no-store" });
        const payload = (await response.json()) as { items?: MailboxAuditEntry[] };
        if (!response.ok || cancelled) {
          return;
        }
        setMailboxAuditEntries(payload.items ?? []);
      } catch {
        // keep settings view functional even if audit feed is unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateGoogleField(field: "workspaceDomain" | "clientId" | "callbackUrl" | "googleMapsApiKey", value: string) {
    setSettings((current) => ({
      ...current,
      googleWorkspace: {
        ...current.googleWorkspace,
        [field]: value
      }
    }));
  }

  function updateGoogleCalendarField(
    field: "calendarName" | "calendarId" | "connectedAccount" | "lastSyncedAt",
    value: string
  ) {
    setSettings((current) => ({
      ...current,
      googleCalendar: {
        ...current.googleCalendar,
        [field]: value
      }
    }));
  }

  function updateGoogleCalendarScopes(value: string) {
    setSettings((current) => ({
      ...current,
      googleCalendar: {
        ...current.googleCalendar,
        grantedScopes: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
    }));
  }

  function updateResidentsMapCenterField(field: "label" | "latitude" | "longitude" | "zoom", value: string) {
    setSettings((current) => ({
      ...current,
      googleWorkspace: {
        ...current.googleWorkspace,
        residentsMapDefaultCenter: {
          ...current.googleWorkspace.residentsMapDefaultCenter,
          [field]: field === "label" ? value : Number(value)
        }
      }
    }));
  }

  function updateAllowedDomains(value: string) {
    setSettings((current) => ({
      ...current,
      googleWorkspace: {
        ...current.googleWorkspace,
        allowedDomains: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }
    }));
  }

  function updateMailboxField(field: "address" | "senderName", value: string) {
    setSettings((current) => ({
      ...current,
      triageMailbox: {
        ...current.triageMailbox,
        [field]: value
      }
    }));
  }

  function updateTelegramText(field: "botName" | "groupName", value: string) {
    setSettings((current) => ({
      ...current,
      telegram: {
        ...current.telegram,
        [field]: value
      }
    }));
  }

  function saveNotificationPolicy() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings }>("/api/super-admin/settings", {
            notificationPolicy: settings.notificationPolicy
          });
          setSettings(payload.item);
          setActionState({ tone: "success", message: "Notification policy updated." });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to save notification policy." });
        }
      })();
    });
  }

  function saveBranding() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings }>("/api/super-admin/settings", {
            branding: settings.branding
          });
          setSettings(payload.item);
          setActionState({ tone: "success", message: "Branding updated." });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to save branding." });
        }
      })();
    });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setSettings((current) => ({
        ...current,
        branding: {
          ...current.branding,
          logoImage: result
        }
      }));
      setActionState({ tone: "success", message: "Logo loaded. Save branding to apply it across the app." });
    };
    reader.onerror = () => {
      setActionState({ tone: "warning", message: "Unable to load logo image." });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function saveSessionPolicy() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings }>("/api/super-admin/settings", {
            sessionPolicy: settings.sessionPolicy
          });
          setSettings(payload.item);
          setActionState({ tone: "success", message: "Session policy updated." });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to save session policy." });
        }
      })();
    });
  }

  function saveSettings(section: "googleWorkspace" | "googleCalendar" | "triageMailbox" | "telegram") {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings }>("/api/super-admin/settings", {
            [section]: settings[section]
          });
          setSettings(payload.item);
          setActionState({ tone: "success", message: `${section} settings saved.` });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to save settings." });
        }
      })();
    });
  }

  function savePublicJoinProtection() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings }>("/api/super-admin/settings", {
            publicJoinProtection: settings.publicJoinProtection
          });
          setSettings(payload.item);
          setActionState({ tone: "success", message: "Public join protection updated." });
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Unable to save public join protection."
          });
        }
      })();
    });
  }

  function saveMaintenance() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ item: PlatformSettings["maintenance"] }>("/api/super-admin/operations/maintenance", settings.maintenance);
          setSettings((current) => ({
            ...current,
            maintenance: payload.item,
            updatedAt: payload.item.lastUpdatedAt
          }));
          setActionState({ tone: "success", message: "Maintenance settings updated." });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to update maintenance settings." });
        }
      })();
    });
  }

  function restartService(serviceId: string) {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ restarted: PlatformService[]; message: string }>(
            "/api/super-admin/operations/restart-services",
            { serviceIds: [serviceId] }
          );
          setServices((current) =>
            current.map((service) => payload.restarted.find((item) => item.id === service.id) ?? service)
          );
          setActionState({ tone: "success", message: payload.message });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to restart service." });
        }
      })();
    });
  }

  function testTelegram() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ message: string }>("/api/super-admin/operations/telegram-test");
          setActionState({ tone: "success", message: payload.message });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to test Telegram." });
        }
      })();
    });
  }

  function purgeNotifications() {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ message: string }>("/api/super-admin/operations/notifications/purge");
          setActionState({ tone: "success", message: payload.message });
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Unable to purge notifications."
          });
        }
      })();
    });
  }

  function connectGoogle() {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/google/start");
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to start Google sign-in.");
          }
          setActionState({ tone: "success", message: payload.message });
          if (payload.url) {
            window.open(payload.url, "_blank", "noopener,noreferrer");
          }
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to start Google sign-in." });
        }
      })();
    });
  }

  function connectGoogleCalendar() {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/google/start?purpose=calendar");
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to start Google Calendar sign-in.");
          }
          setActionState({ tone: "success", message: payload.message });
          if (payload.url) {
            window.open(payload.url, "_blank", "noopener,noreferrer");
          }
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Unable to start Google Calendar sign-in."
          });
        }
      })();
    });
  }

  function connectMailbox() {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/auth/google/start?purpose=mailbox");
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to start mailbox sign-in.");
          }
          setActionState({ tone: "success", message: payload.message });
          if (payload.url) {
            window.open(payload.url, "_blank", "noopener,noreferrer");
          }
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Unable to start mailbox sign-in."
          });
        }
      })();
    });
  }

  function testMailboxSync() {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/super-admin/operations/mailbox-sync-test", {
            method: "POST"
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error ?? "Mailbox sync test failed.");
          }
          setActionState({ tone: "success", message: payload.message ?? "Mailbox sync test complete." });
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Mailbox sync test failed."
          });
        }
      })();
    });
  }

  function revokeTrackedSession(sessionId: string) {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ message: string }>("/api/super-admin/operations/sessions/revoke", { sessionId });
          setActionState({ tone: "success", message: payload.message });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to revoke session." });
        }
      })();
    });
  }

  function revokeUserSessions(userEmail: string) {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await postJson<{ message: string }>("/api/super-admin/operations/sessions/revoke-user", { userEmail });
          setActionState({ tone: "success", message: payload.message });
        } catch (error) {
          setActionState({ tone: "warning", message: error instanceof Error ? error.message : "Unable to revoke user sessions." });
        }
      })();
    });
  }

  return (
    <>
      {actionState ? (
        <section className={`surface-panel flash-panel flash-panel-${actionState.tone}`}>
          <strong>{actionState.message}</strong>
        </section>
      ) : null}

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Settings Sections</h2>
            <p>Focus one settings area at a time to reduce noise and speed up administration.</p>
          </div>
          <span className="status-chip status-chip-default">{settingsSectionOptions.find((item) => item.id === activeSection)?.label}</span>
        </div>
        <div className="status-button-row">
          {settingsSectionOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`status-choice-button ${activeSection === item.id ? "status-choice-button-active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="action-row">
          <Link href="/dashboard/super-admin/identity-access" className="button-secondary">Identity & Access</Link>
          <Link href="/dashboard/super-admin/mailbox-calendar" className="button-secondary">Mailbox & Calendar</Link>
          <Link href="/dashboard/super-admin/public-security" className="button-secondary">Public & Security</Link>
          <Link href="/dashboard/super-admin/branding-platform" className="button-secondary">Branding & Platform</Link>
          <Link href="/dashboard/super-admin/operations-reliability" className="button-secondary">Operations & Reliability</Link>
          <Link href="/dashboard/super-admin/governance-audit" className="button-secondary">Governance & Audit</Link>
          <Link href="/dashboard/super-admin/communication-settings" className="button-primary">Open Communication Settings</Link>
        </div>
      </section>

      {isSectionVisible("mailbox-calendar") ? (
      <section className="detail-grid">
        <article id="settings-google-workspace" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Google Workspace Identity</h2>
              <p>Configure Google SSO and workspace access for internal admins.</p>
            </div>
            <span className={`status-chip status-chip-${settings.googleWorkspace.status}`}>{settings.googleWorkspace.status}</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Workspace Domain</span>
              <input value={settings.googleWorkspace.workspaceDomain} onChange={(event) => updateGoogleField("workspaceDomain", event.target.value)} />
            </label>
            <label className="field">
              <span>Google Client ID</span>
              <input value={settings.googleWorkspace.clientId} onChange={(event) => updateGoogleField("clientId", event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>Allowed Domains</span>
              <input
                value={settings.googleWorkspace.allowedDomains.join(", ")}
                onChange={(event) => updateAllowedDomains(event.target.value)}
                placeholder="unityincommunity.org.za"
              />
            </label>
            <label className="field field-wide">
              <span>Callback URL</span>
              <input value={settings.googleWorkspace.callbackUrl} onChange={(event) => updateGoogleField("callbackUrl", event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>Google Maps API Key</span>
              <div className="secret-field-row">
                <input
                  type={showGoogleMapsApiKey ? "text" : "password"}
                  value={settings.googleWorkspace.googleMapsApiKey}
                  onChange={(event) => updateGoogleField("googleMapsApiKey", event.target.value)}
                  placeholder="Paste the browser Maps/Places key here"
                />
                <button
                  type="button"
                  className="secret-toggle-button"
                  onClick={() => setShowGoogleMapsApiKey((current) => !current)}
                  aria-label={showGoogleMapsApiKey ? "Hide Google Maps API key" : "Show Google Maps API key"}
                >
                  {showGoogleMapsApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <label className="field field-wide">
              <span>Residents Map Default Center</span>
              <input
                value={settings.googleWorkspace.residentsMapDefaultCenter.label}
                onChange={(event) => updateResidentsMapCenterField("label", event.target.value)}
                placeholder="Woodlands Avenue, Mount Vernon, Durban 4095"
              />
            </label>
            <label className="field">
              <span>Map Center Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={settings.googleWorkspace.residentsMapDefaultCenter.latitude}
                onChange={(event) => updateResidentsMapCenterField("latitude", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Map Center Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={settings.googleWorkspace.residentsMapDefaultCenter.longitude}
                onChange={(event) => updateResidentsMapCenterField("longitude", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Residents Map Zoom</span>
              <input
                type="number"
                min="10"
                max="18"
                value={settings.googleWorkspace.residentsMapDefaultCenter.zoom}
                onChange={(event) => updateResidentsMapCenterField("zoom", event.target.value)}
              />
            </label>
          </div>
          <div className="meta-row">
            <span>Client secret configured: {settings.googleWorkspace.clientSecretConfigured ? "Yes" : "No"}</span>
            <span>Last updated: {new Date(settings.updatedAt).toLocaleString("en-ZA")}</span>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={() => saveSettings("googleWorkspace")}>Save Google settings</button>
            <button className="button-secondary" disabled={isPending} onClick={connectGoogle}>Start Google OAuth</button>
          </div>
        </article>

        <article id="settings-google-calendar" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Google Calendar</h2>
              <p>Configure the shared calendar connection, sync mode, and authentication details for dashboard calendar sync.</p>
            </div>
            <span className={`status-chip status-chip-${settings.googleCalendar.connectionStatus}`}>
              {settings.googleCalendar.connectionStatus}
            </span>
          </div>
          <div className="form-grid">
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.googleCalendar.enabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    googleCalendar: {
                      ...current.googleCalendar,
                      enabled: event.target.checked
                    }
                  }))
                }
              />
              <span>Enable Google Calendar sync</span>
            </label>
            <label className="field">
              <span>Sync Mode</span>
              <select
                value={settings.googleCalendar.syncMode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    googleCalendar: {
                      ...current.googleCalendar,
                      syncMode: event.target.value as "read-only" | "read-write"
                    }
                  }))
                }
              >
                <option value="read-only">Read Only</option>
                <option value="read-write">Read / Write</option>
              </select>
            </label>
            <label className="field">
              <span>Calendar Name</span>
              <input
                value={settings.googleCalendar.calendarName}
                onChange={(event) => updateGoogleCalendarField("calendarName", event.target.value)}
                placeholder="Our Shared Calendar"
              />
            </label>
            <label className="field field-wide">
              <span>Calendar ID</span>
              <input
                value={settings.googleCalendar.calendarId}
                onChange={(event) => updateGoogleCalendarField("calendarId", event.target.value)}
                placeholder="Paste the shared Google Calendar ID here"
              />
            </label>
            <label className="field field-wide">
              <span>Connected Account</span>
              <input
                value={settings.googleCalendar.connectedAccount}
                onChange={(event) => updateGoogleCalendarField("connectedAccount", event.target.value)}
                placeholder="unityincommunity.org.za account with access to the shared calendar"
              />
            </label>
            <label className="field field-wide">
              <span>Granted Scopes</span>
              <input
                value={settings.googleCalendar.grantedScopes.join(", ")}
                onChange={(event) => updateGoogleCalendarScopes(event.target.value)}
                placeholder="https://www.googleapis.com/auth/calendar.events"
              />
            </label>
            <label className="field">
              <span>Last Synced At</span>
              <input
                value={settings.googleCalendar.lastSyncedAt}
                onChange={(event) => updateGoogleCalendarField("lastSyncedAt", event.target.value)}
                placeholder="2026-03-28T17:30:00+02:00"
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.googleCalendar.refreshTokenConfigured}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    googleCalendar: {
                      ...current.googleCalendar,
                      refreshTokenConfigured: event.target.checked
                    }
                  }))
                }
              />
              <span>Refresh token configured on the server</span>
            </label>
          </div>
          <div className="meta-row">
            <span>Use a real Workspace user that has access to the shared calendar.</span>
            <span>Calendar OAuth should request Google Calendar scopes before live sync is enabled.</span>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={() => saveSettings("googleCalendar")}>
              Save calendar settings
            </button>
            <button className="button-secondary" disabled={isPending} onClick={connectGoogleCalendar}>
              Connect Google Calendar
            </button>
          </div>
        </article>

        <article id="settings-triage-mailbox" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Triage Mailbox</h2>
              <p>Set the collaborative inbox and sender identity used by the platform.</p>
            </div>
            <span className="status-chip status-chip-warning">{settings.triageMailbox.inboundSync}</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Mailbox Address</span>
              <input value={settings.triageMailbox.address} onChange={(event) => updateMailboxField("address", event.target.value)} />
            </label>
            <label className="field">
              <span>Sender Name</span>
              <input value={settings.triageMailbox.senderName} onChange={(event) => updateMailboxField("senderName", event.target.value)} />
            </label>
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.triageMailbox.primaryChannel}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    triageMailbox: {
                      ...current.triageMailbox,
                      primaryChannel: event.target.checked
                    }
                  }))
                }
              />
              <span>Use as primary sender and receiver channel</span>
            </label>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={() => saveSettings("triageMailbox")}>Save mailbox settings</button>
            <button className="button-secondary" disabled={isPending} onClick={connectMailbox}>Connect Mailbox</button>
            <button className="button-secondary" disabled={isPending} onClick={testMailboxSync}>Test Mailbox Sync</button>
          </div>
        </article>
      </section>
      ) : null}

      {isSectionVisible("public-security") ? (
      <section className="detail-grid">
        <article id="settings-public-join-protection" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Public Join Protection</h2>
              <p>Configure Cloudflare Turnstile and lightweight anti-bot rules for the public resident join form.</p>
            </div>
            <span className={`status-chip status-chip-${settings.publicJoinProtection.turnstileEnabled ? "success" : "warning"}`}>
              {settings.publicJoinProtection.turnstileEnabled ? "enabled" : "disabled"}
            </span>
          </div>
          <div className="form-grid">
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.publicJoinProtection.turnstileEnabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    publicJoinProtection: {
                      ...current.publicJoinProtection,
                      turnstileEnabled: event.target.checked
                    }
                  }))
                }
              />
              <span>Enable Cloudflare Turnstile on the public join form</span>
            </label>
            <label className="field field-wide">
              <span>Turnstile Site Key</span>
              <div className="secret-field-row">
                <input
                  type={showTurnstileSiteKey ? "text" : "password"}
                  value={settings.publicJoinProtection.turnstileSiteKey}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      publicJoinProtection: {
                        ...current.publicJoinProtection,
                        turnstileSiteKey: event.target.value
                      }
                    }))
                  }
                  placeholder="Paste the public Turnstile site key here"
                />
                <button
                  type="button"
                  className="secret-toggle-button"
                  onClick={() => setShowTurnstileSiteKey((current) => !current)}
                  aria-label={showTurnstileSiteKey ? "Hide Turnstile site key" : "Show Turnstile site key"}
                >
                  {showTurnstileSiteKey ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <label className="field">
              <span>Minimum Completion Seconds</span>
              <input
                type="number"
                value={settings.publicJoinProtection.minimumCompletionSeconds}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    publicJoinProtection: {
                      ...current.publicJoinProtection,
                      minimumCompletionSeconds: Number(event.target.value)
                    }
                  }))
                }
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.publicJoinProtection.turnstileSecretConfigured}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    publicJoinProtection: {
                      ...current.publicJoinProtection,
                      turnstileSecretConfigured: event.target.checked
                    }
                  }))
                }
              />
              <span>Turnstile secret configured on the server</span>
            </label>
          </div>
          <div className="meta-row">
            <span>Site key is managed here in Settings.</span>
            <span>Production secret should be stored on the server before enabling live verification.</span>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={savePublicJoinProtection}>
              Save public join protection
            </button>
          </div>
        </article>
      </section>
      ) : null}

      {isSectionVisible("identity-access") ? (
      <section className="detail-grid">
        <article id="settings-session-policy" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Session Policy</h2>
              <p>Control idle timeouts, warning windows, multi-session rules, and app-side session lifetime.</p>
            </div>
            <span className="status-chip status-chip-default">Session Control</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Idle Timeout (Minutes)</span>
              <input
                type="number"
                value={settings.sessionPolicy.idleTimeoutMinutes}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    sessionPolicy: {
                      ...current.sessionPolicy,
                      idleTimeoutMinutes: Number(event.target.value)
                    }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Absolute Session Hours</span>
              <input
                type="number"
                value={settings.sessionPolicy.absoluteSessionHours}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    sessionPolicy: {
                      ...current.sessionPolicy,
                      absoluteSessionHours: Number(event.target.value)
                    }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Warn Before Expiry (Minutes)</span>
              <input
                type="number"
                value={settings.sessionPolicy.warnBeforeExpiryMinutes}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    sessionPolicy: {
                      ...current.sessionPolicy,
                      warnBeforeExpiryMinutes: Number(event.target.value)
                    }
                  }))
                }
              />
            </label>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.sessionPolicy.allowMultipleSessions}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    sessionPolicy: {
                      ...current.sessionPolicy,
                      allowMultipleSessions: event.target.checked
                    }
                  }))
                }
              />
              <span>Allow multiple concurrent sessions</span>
            </label>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={saveSessionPolicy}>Save session policy</button>
          </div>
        </article>

        <article id="settings-active-sessions" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Active Sessions</h2>
              <p>Review current sessions, identify idle users, and revoke access when needed.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.activeSessions.map((session) => (
              <article key={session.id} className="panel-card">
                <div className="panel-head">
                  <h3>{session.userName}</h3>
                  <span className={`status-chip status-chip-${session.status}`}>{session.status}</span>
                </div>
                <div className="meta-row">
                  <span>{session.userEmail}</span>
                  <span>{session.role}</span>
                  <span>{session.userAgent ?? "Unknown device"}</span>
                </div>
                <div className="meta-row">
                  <span>Last activity: {new Date(session.lastActivityAt).toLocaleString("en-ZA")}</span>
                  <span>Expires: {new Date(session.expiresAt).toLocaleString("en-ZA")}</span>
                </div>
                <div className="action-row">
                  <button className="button-secondary" disabled={isPending} onClick={() => revokeTrackedSession(session.id)}>Revoke session</button>
                  <button className="button-secondary" disabled={isPending} onClick={() => revokeUserSessions(session.userEmail)}>Revoke all for user</button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
      ) : null}

      {isSectionVisible("identity-access", "branding-platform") ? (
      <section className="detail-grid">
        {isSectionVisible("identity-access") ? (
        <article id="settings-access-governance" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Access And Governance</h2>
              <p>Platform-wide access overview, role visibility, and audit readiness.</p>
            </div>
            <span className="status-chip status-chip-default">Control Plane</span>
          </div>
          <div className="config-grid">
            <div className="config-item">
              <label>Total Admins</label>
              <strong>{controlCenter.accessSummary.totalAdmins}</strong>
            </div>
            <div className="config-item">
              <label>Super Admins</label>
              <strong>{controlCenter.accessSummary.totalSuperAdmins}</strong>
            </div>
            <div className="config-item">
              <label>Inactive Admins</label>
              <strong>{controlCenter.accessSummary.inactiveAdmins}</strong>
            </div>
            <div className="config-item">
              <label>Last Access Review</label>
              <strong>{new Date(controlCenter.accessSummary.lastAccessReviewAt).toLocaleString("en-ZA")}</strong>
            </div>
          </div>
          <div className="action-row">
            <span className="action-pill">Role management will live here</span>
            <span className="action-pill">All access changes are audit tracked</span>
          </div>
        </article>
        ) : null}

        {isSectionVisible("branding-platform") ? (
        <article id="settings-branding-policy" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Branding And Notification Policy</h2>
              <p>Keep the platform consistent while managing quiet-hours and channel defaults.</p>
            </div>
            <span className="status-chip status-chip-default">{settings.branding.platformFont}</span>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Logo Image</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
            </label>
            <div className="field field-wide">
              <span>Logo Preview</span>
              <div className="branding-logo-preview">
                {settings.branding.logoImage ? (
                  <img src={settings.branding.logoImage} alt="Brand logo preview" className="branding-logo-preview-image" />
                ) : (
                  <div className="branding-logo-preview-placeholder">Logo placeholder</div>
                )}
              </div>
            </div>
            <label className="field field-wide">
              <span>Organisation Name</span>
              <input
                value={settings.branding.organisationName}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    branding: { ...current.branding, organisationName: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field field-wide">
              <span>Platform Subtitle</span>
              <input
                value={settings.branding.platformSubtitle}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    branding: { ...current.branding, platformSubtitle: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Platform Font</span>
              <input value={settings.branding.platformFont} readOnly />
            </label>
            <label className="field">
              <span>Email Theme</span>
              <input value={settings.branding.emailTheme} readOnly />
            </label>
            <label className="field">
              <span>Quiet Hours Start</span>
              <input
                value={settings.notificationPolicy.quietHoursStart}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    notificationPolicy: { ...current.notificationPolicy, quietHoursStart: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Quiet Hours End</span>
              <input
                value={settings.notificationPolicy.quietHoursEnd}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    notificationPolicy: { ...current.notificationPolicy, quietHoursEnd: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field field-wide">
              <span>Quiet Days</span>
              <input
                value={settings.notificationPolicy.quietDays.join(", ")}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    notificationPolicy: {
                      ...current.notificationPolicy,
                      quietDays: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                    }
                  }))
                }
              />
            </label>
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.notificationPolicy.telegramCriticalOnly}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    notificationPolicy: {
                      ...current.notificationPolicy,
                      telegramCriticalOnly: event.target.checked
                    }
                  }))
                }
              />
              <span>Telegram critical-only mode</span>
            </label>
          </div>
          <div className="action-row">
            <button className="button-secondary" disabled={isPending} onClick={saveBranding}>Save branding</button>
            <button className="button-primary" disabled={isPending} onClick={saveNotificationPolicy}>Save notification policy</button>
            <span className="action-pill">Aptos remains Super Admin controlled</span>
          </div>
        </article>
        ) : null}
      </section>
      ) : null}

      {isSectionVisible("governance-audit", "public-security") ? (
      <section className="detail-grid">
        {isSectionVisible("governance-audit") ? (
        <article id="settings-notification-controls" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Notification Controls</h2>
              <p>Manually clear notifications and use Communication Settings for Email/Telegram mode control.</p>
            </div>
            <span className="status-chip status-chip-warning">Manual Control</span>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={purgeNotifications}>Purge notifications</button>
            <Link href="/dashboard/super-admin/communication-settings" className="button-secondary">
              Open Communication Settings
            </Link>
          </div>
        </article>
        ) : null}

        {isSectionVisible("governance-audit") ? (
        <article id="settings-mailbox-audit" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Mailbox Assignment And Status Audit</h2>
              <p>Readable audit trail for mailbox reads, assignments, reassignments, status updates, and actions.</p>
            </div>
            <span className="status-chip status-chip-default">{mailboxAuditEntries.length} entries</span>
          </div>
          <div className="panel-list">
            {mailboxAuditEntries.length > 0 ? (
              mailboxAuditEntries.slice(0, 50).map((entry) => (
                <article key={entry.id} className="panel-card">
                  <div className="panel-head">
                    <h3>{entry.detail}</h3>
                    <span className="status-chip status-chip-default">{entry.eventType}</span>
                  </div>
                  <div className="meta-row">
                    <span>Message: {entry.messageId}</span>
                    <span>Actor: {entry.actorName}</span>
                    <span>{new Date(entry.createdAt).toLocaleString("en-ZA")}</span>
                  </div>
                </article>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No mailbox audit entries yet.</strong>
              </article>
            )}
          </div>
        </article>
        ) : null}

        {isSectionVisible("public-security") ? (
        <article id="settings-maintenance" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Maintenance Mode</h2>
              <p>Toggle maintenance and control the notice shown to internal users.</p>
            </div>
            <span className={`status-chip status-chip-${settings.maintenance.modeEnabled ? "warning" : "success"}`}>
              {settings.maintenance.modeEnabled ? "enabled" : "disabled"}
            </span>
          </div>
          <div className="form-grid">
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.maintenance.modeEnabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maintenance: { ...current.maintenance, modeEnabled: event.target.checked }
                  }))
                }
              />
              <span>Enable maintenance mode</span>
            </label>
            <label className="toggle-field field-wide">
              <input
                type="checkbox"
                checked={settings.maintenance.allowSuperAdminAccessOnly}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maintenance: { ...current.maintenance, allowSuperAdminAccessOnly: event.target.checked }
                  }))
                }
              />
              <span>Allow Super Admin access during maintenance</span>
            </label>
            <label className="field field-wide">
              <span>Maintenance Message</span>
              <textarea
                rows={4}
                value={settings.maintenance.bannerMessage}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    maintenance: { ...current.maintenance, bannerMessage: event.target.value }
                  }))
                }
              />
            </label>
          </div>
          <div className="action-row">
            <button className="button-primary" disabled={isPending} onClick={saveMaintenance}>Save maintenance settings</button>
          </div>
        </article>
        ) : null}
      </section>
      ) : null}

      {isSectionVisible("operations-reliability") ? (
      <section id="settings-service-operations" className="surface-panel">
        <div className="section-header">
          <div>
            <h2>Service Operations</h2>
            <p>Restart services from the app control plane and track their latest restart timestamps.</p>
          </div>
        </div>
        <div className="panel-list">
          {services.map((service) => (
            <article key={service.id} className="panel-card">
              <div className="panel-head">
                <h3>{service.name}</h3>
                <span className={`status-chip status-chip-${service.status}`}>{service.status}</span>
              </div>
              <p>{service.description}</p>
              <div className="meta-row">
                <span>Host: {service.host}</span>
                <span>
                  Last restart: {service.lastRestartAt ? new Date(service.lastRestartAt).toLocaleString("en-ZA") : "Not yet recorded"}
                </span>
              </div>
              <div className="action-row">
                <button className="button-primary" disabled={isPending} onClick={() => restartService(service.id)}>Restart service</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {isSectionVisible("operations-reliability") ? (
      <section className="detail-grid">
        <article id="settings-connector-health" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Connector Health</h2>
              <p>Monitor connected systems, token health, sync recency, and reauthorization needs.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.connectors.map((connector) => (
              <article key={connector.id} className="panel-card">
                <div className="panel-head">
                  <h3>{connector.name}</h3>
                  <span className={`status-chip status-chip-${connector.status}`}>{connector.status}</span>
                </div>
                <div className="meta-row">
                  <span>Auth: {connector.authType}</span>
                  <span>{connector.lastSyncAt ? `Last sync: ${new Date(connector.lastSyncAt).toLocaleString("en-ZA")}` : "No successful sync yet"}</span>
                </div>
                {connector.lastError ? <p>{connector.lastError}</p> : null}
              </article>
            ))}
          </div>
        </article>

        <article id="settings-automation-jobs" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Automation Jobs</h2>
              <p>Track the background jobs that keep escalations, archiving, sync, and reminders running.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.automationJobs.map((job) => (
              <article key={job.id} className="panel-card">
                <div className="panel-head">
                  <h3>{job.name}</h3>
                  <span className={`status-chip status-chip-${job.status}`}>{job.status}</span>
                </div>
                <div className="meta-row">
                  <span>{job.cadence}</span>
                  <span>{job.lastRunAt ? `Last run: ${new Date(job.lastRunAt).toLocaleString("en-ZA")}` : "No run logged"}</span>
                  <span>{job.nextRunAt ? `Next run: ${new Date(job.nextRunAt).toLocaleString("en-ZA")}` : "No next run scheduled"}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
      ) : null}

      {isSectionVisible("operations-reliability") ? (
      <section className="detail-grid">
        <article id="settings-migration-checklist" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Post-Migration Checklist</h2>
              <p>Cloud cutover actions to keep Telegram automation and background jobs always on.</p>
            </div>
            <span className="status-chip status-chip-warning">Pending</span>
          </div>
          <div className="panel-list">
            <article className="panel-card">
              <div className="panel-head">
                <h3>Configure Cloud Cron For Deferred Telegram Job</h3>
                <span className="status-chip status-chip-warning">To Do</span>
              </div>
              <p>
                After migration, configure platform cron to call <code>POST /api/jobs/telegram-deferred</code> every 5 minutes with the
                <code> x-job-token</code> header set to <code>JOB_RUNNER_TOKEN</code>.
              </p>
              <div className="meta-row">
                <span>Purpose: keep deferred Telegram alerts automated without Windows Task Scheduler.</span>
                <span>Also runs weekday 07:00 SAST morning weather Telegram briefing, excluding SA public holidays.</span>
              </div>
            </article>
          </div>
        </article>

        <article id="settings-error-center" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Error And Failure Center</h2>
              <p>Surface actionable failures across messaging, syncs, imports, and operational automation.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.failures.map((failure) => (
              <article key={failure.id} className="panel-card">
                <div className="panel-head">
                  <h3>{failure.title}</h3>
                  <span className={`status-chip status-chip-${failure.severity}`}>{failure.area}</span>
                </div>
                <p>{failure.detail}</p>
                <div className="meta-row">
                  <span>{new Date(failure.occurredAt).toLocaleString("en-ZA")}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article id="settings-data-quality" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Data Quality Dashboard</h2>
              <p>Keep records trustworthy by surfacing missing, duplicate, and incomplete data signals.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.qualityMetrics.map((metric) => (
              <article key={metric.id} className="panel-card">
                <div className="panel-head">
                  <h3>{metric.label}</h3>
                  <span className="status-chip status-chip-default">{metric.value}</span>
                </div>
                <p>{metric.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
      ) : null}

      {isSectionVisible("branding-platform") ? (
      <section className="detail-grid">
        <article id="settings-usage-stats" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Usage And Assistant Stats</h2>
              <p>Use real platform usage patterns to improve training, self-help, and admin adoption.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.usageMetrics.map((metric) => (
              <article key={metric.id} className="panel-card">
                <div className="panel-head">
                  <h3>{metric.label}</h3>
                  <span className="status-chip status-chip-success">{metric.value}</span>
                </div>
                <p>{metric.trend}</p>
              </article>
            ))}
          </div>
        </article>

        <article id="settings-templates-surfaces" className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Templates And Public Surfaces</h2>
              <p>Control reusable communication templates and public-facing app surfaces from one place.</p>
            </div>
          </div>
          <div className="panel-list">
            {controlCenter.templates.map((template) => (
              <article key={template.id} className="panel-card">
                <div className="panel-head">
                  <h3>{template.name}</h3>
                  <span className={`status-chip status-chip-${template.status}`}>{template.area}</span>
                </div>
                <div className="meta-row">
                  <span>{template.status}</span>
                  <span>{new Date(template.lastUpdatedAt).toLocaleString("en-ZA")}</span>
                </div>
              </article>
            ))}
            {controlCenter.publicSurfaces.map((surface) => (
              <article key={surface.id} className="panel-card">
                <div className="panel-head">
                  <h3>{surface.name}</h3>
                  <span className={`status-chip status-chip-${surface.visibility === "live" ? "success" : surface.visibility === "maintenance" ? "warning" : "danger"}`}>
                    {surface.visibility}
                  </span>
                </div>
                <p>{surface.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
      ) : null}
    </>
  );
}
