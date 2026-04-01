"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlatformSettings } from "@/types/domain";

type Props = {
  initialSettings: PlatformSettings;
};

type Mode = "off" | "live" | "demo";
type TemplateKey = "faultInitialEscalation" | "faultEscalatePlus" | "faultEscalatePlusPlus" | "faultReopened";
type TemplateField = "subjectTemplate" | "bodyTemplate" | "signature";

const templateOptions: Array<{ key: TemplateKey; label: string }> = [
  { key: "faultInitialEscalation", label: "Fault Initial Escalation" },
  { key: "faultEscalatePlus", label: "Fault Escalate+" },
  { key: "faultEscalatePlusPlus", label: "Fault Escalate++" },
  { key: "faultReopened", label: "Fault Reopened" }
];

const templateTokenHelp = [
  "{faultRef}",
  "{faultId}",
  "{residentId}",
  "{title}",
  "{category}",
  "{subCategory}",
  "{priority}",
  "{location}",
  "{daysOpen}",
  "{reopenReason}",
  "{officeBearerName}",
  "{officeBearerEmail}",
  "{trackingToken}"
];

function parseRecipients(value: string) {
  return value
    .split(/[\n,;]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function CommunicationSettingsConsole({ initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [actionState, setActionState] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const [showDemoBotToken, setShowDemoBotToken] = useState(false);
  const [showWordpressPassword, setShowWordpressPassword] = useState(false);
  const [activeTemplateKey, setActiveTemplateKey] = useState<TemplateKey>("faultInitialEscalation");
  const [activeTemplateField, setActiveTemplateField] = useState<TemplateField>("bodyTemplate");
  const [isCouncillorEditing, setIsCouncillorEditing] = useState(false);
  const [isEmailEditing, setIsEmailEditing] = useState(false);
  const [isTelegramEditing, setIsTelegramEditing] = useState(false);
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);
  const [isWordpressEditing, setIsWordpressEditing] = useState(false);

  const activeTemplate = settings.communicationTemplates[activeTemplateKey];
  const councillor = settings.communicationSettings.councillor ?? {
    name: "",
    email: "",
    cellNumber: ""
  };

  function replaceTemplateTokens(value: string) {
    const sampleTokens: Record<string, string> = {
      faultRef: "ETK-ELEC-2001",
      faultId: "fault-1",
      residentId: "res-14",
      title: "Street lights out near entrance bend",
      category: "electricity",
      subCategory: "Street Light Fault",
      priority: "critical",
      location: "Woodlands Avenue, Mount Vernon, Durban",
      daysOpen: "5",
      reopenReason: "Issue has recurred after closure",
      officeBearerName: "Wayne Erradu",
      officeBearerEmail: "wayne.erradu@unityincommunity.org.za",
      trackingToken: "UIC-F:fault-1|R:res-14"
    };

    let next = value;
    for (const [token, tokenValue] of Object.entries(sampleTokens)) {
      next = next.split(`{${token}}`).join(tokenValue);
    }
    return next;
  }

  function updateActiveTemplateField(field: TemplateField, value: string) {
    setSettings((current) => ({
      ...current,
      communicationTemplates: {
        ...current.communicationTemplates,
        [activeTemplateKey]: {
          ...current.communicationTemplates[activeTemplateKey],
          [field]: value
        }
      }
    }));
  }

  function insertToken(token: string) {
    const currentValue = settings.communicationTemplates[activeTemplateKey][activeTemplateField];
    updateActiveTemplateField(activeTemplateField, `${currentValue}${currentValue ? " " : ""}${token}`);
  }

  function setEmailMode(mode: Mode) {
    setSettings((current) => ({
      ...current,
      communicationSettings: {
        ...current.communicationSettings,
        email: {
          ...current.communicationSettings.email,
          mode
        }
      }
    }));
  }

  function setTelegramMode(mode: Mode) {
    setSettings((current) => ({
      ...current,
      communicationSettings: {
        ...current.communicationSettings,
        telegram: {
          ...current.communicationSettings.telegram,
          mode
        }
      }
    }));
  }

  function saveCommunicationSettings(message = "Communication settings saved.") {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/super-admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              communicationSettings: settings.communicationSettings,
              communicationTemplates: settings.communicationTemplates,
              wordpress: settings.wordpress
            })
          });
          const payload = (await response.json()) as { item?: PlatformSettings; error?: string };
          if (!response.ok || !payload.item) {
            throw new Error(payload.error ?? "Unable to save communication settings.");
          }
          setSettings(payload.item);
          setLastSavedSettings(payload.item);
          setActionState({ tone: "success", message });
          router.refresh();
        } catch (error) {
          setActionState({
            tone: "warning",
            message: error instanceof Error ? error.message : "Unable to save communication settings."
          });
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

      <section className="detail-grid">
        <article className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Ward Councillor Contact</h2>
              <p>This is the contact for the Duly Elected Ward Councillor for Ward 65 eThekwini and she is in kept in all communications.</p>
            </div>
            <span className="status-chip status-chip-default">Fault Email Default CC</span>
          </div>
          <div className="action-row">
            {!isCouncillorEditing ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsCouncillorEditing(true)}
              >
                Edit Councillor Contact
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setSettings((current) => ({
                      ...current,
                      communicationSettings: {
                        ...current.communicationSettings,
                        councillor: {
                          ...lastSavedSettings.communicationSettings.councillor
                        }
                      }
                    }));
                    setIsCouncillorEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="button-primary"
                  disabled={isPending}
                  onClick={() => {
                    saveCommunicationSettings("Councillor contact saved.");
                    setIsCouncillorEditing(false);
                  }}
                >
                  Save Councillor Contact
                </button>
              </>
            )}
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Councillor Name</span>
              <input
                value={councillor.name ?? ""}
                disabled={!isCouncillorEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    communicationSettings: {
                      ...current.communicationSettings,
                      councillor: {
                        ...current.communicationSettings.councillor,
                        name: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Councillor full name"
              />
            </label>
            <label className="field">
              <span>Councillor Email</span>
              <input
                type="email"
                value={councillor.email ?? ""}
                disabled={!isCouncillorEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    communicationSettings: {
                      ...current.communicationSettings,
                      councillor: {
                        ...current.communicationSettings.councillor,
                        email: event.target.value
                      }
                    }
                  }))
                }
                placeholder="councillor@domain.gov.za"
              />
            </label>
            <label className="field">
              <span>Councillor Cell Number</span>
              <input
                value={councillor.cellNumber ?? ""}
                disabled={!isCouncillorEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    communicationSettings: {
                      ...current.communicationSettings,
                      councillor: {
                        ...current.communicationSettings.councillor,
                        cellNumber: event.target.value
                      }
                    }
                  }))
                }
                placeholder="+27..."
              />
            </label>
          </div>
        </article>

        <article className="surface-panel">
          <div className="section-header">
            <div>
              <h2>WordPress Blog Integration</h2>
              <p>Publish approved PRO drafts directly to your self-hosted WordPress site.</p>
            </div>
            <span className="status-chip status-chip-default">{settings.wordpress.enabled ? "ENABLED" : "DISABLED"}</span>
          </div>
          <div className="action-row">
            {!isWordpressEditing ? (
              <button type="button" className="button-secondary" onClick={() => setIsWordpressEditing(true)}>
                Edit WordPress Settings
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setSettings((current) => ({
                      ...current,
                      wordpress: { ...lastSavedSettings.wordpress }
                    }));
                    setIsWordpressEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button-primary"
                  disabled={isPending}
                  onClick={() => {
                    saveCommunicationSettings("WordPress integration settings saved.");
                    setIsWordpressEditing(false);
                  }}
                >
                  Save WordPress Settings
                </button>
              </>
            )}
          </div>
          <div className="form-grid">
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={settings.wordpress.enabled}
                disabled={!isWordpressEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wordpress: {
                      ...current.wordpress,
                      enabled: event.target.checked
                    }
                  }))
                }
              />
              <span>Enable WordPress Publishing</span>
            </label>
            <label className="field field-wide">
              <span>WordPress Base URL</span>
              <input
                value={settings.wordpress.baseUrl}
                disabled={!isWordpressEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wordpress: {
                      ...current.wordpress,
                      baseUrl: event.target.value
                    }
                  }))
                }
                placeholder="https://yourdomain.com"
              />
            </label>
            <label className="field">
              <span>WordPress Username</span>
              <input
                value={settings.wordpress.username}
                disabled={!isWordpressEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wordpress: {
                      ...current.wordpress,
                      username: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Application Password</span>
              <div className="secret-field-row">
                <input
                  type={showWordpressPassword ? "text" : "password"}
                  value={settings.wordpress.appPassword}
                  disabled={!isWordpressEditing}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      wordpress: {
                        ...current.wordpress,
                        appPassword: event.target.value
                      }
                    }))
                  }
                />
                <button
                  type="button"
                  className="secret-toggle-button"
                  disabled={!isWordpressEditing}
                  onClick={() => setShowWordpressPassword((current) => !current)}
                >
                  {showWordpressPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <label className="field">
              <span>Default Post Status</span>
              <select
                value={settings.wordpress.defaultStatus}
                disabled={!isWordpressEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wordpress: {
                      ...current.wordpress,
                      defaultStatus: event.target.value as "draft" | "publish"
                    }
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
              </select>
            </label>
            <label className="field">
              <span>Default Category</span>
              <select
                value={settings.wordpress.defaultCategory}
                disabled={!isWordpressEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    wordpress: {
                      ...current.wordpress,
                      defaultCategory: event.target.value
                    }
                  }))
                }
              >
                {settings.wordpress.categories.map((item) => (
                  <option key={`wp-default-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Allowed Categories</span>
              <textarea value={settings.wordpress.categories.join(", ")} readOnly rows={2} />
            </label>
          </div>
        </article>

        <article className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Email Notifications</h2>
              <p>Live keeps your existing email workflows, Demo sends only to test recipients, Off disables sends.</p>
            </div>
            <span className="status-chip status-chip-default">{settings.communicationSettings.email.mode.toUpperCase()}</span>
          </div>
          <div className="status-button-row">
            {(["off", "live", "demo"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`status-choice-button ${settings.communicationSettings.email.mode === mode ? "status-choice-button-active" : ""}`}
                onClick={() => setEmailMode(mode)}
              >
                {mode === "off" ? "Email Off" : mode === "live" ? "Email Live" : "Email Demo"}
              </button>
            ))}
          </div>
          {settings.communicationSettings.email.mode === "demo" ? (
            <>
              <div className="action-row">
                {!isEmailEditing ? (
                  <button type="button" className="button-secondary" onClick={() => setIsEmailEditing(true)}>
                    Edit Demo Email Recipients
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setSettings((current) => ({
                          ...current,
                          communicationSettings: {
                            ...current.communicationSettings,
                            email: {
                              ...lastSavedSettings.communicationSettings.email
                            }
                          }
                        }));
                        setIsEmailEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={isPending}
                      onClick={() => {
                        saveCommunicationSettings("Demo email notification settings saved.");
                        setIsEmailEditing(false);
                      }}
                    >
                      Save Demo Email Settings
                    </button>
                  </>
                )}
              </div>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>Demo Email Recipients</span>
                  <textarea
                    rows={4}
                    value={settings.communicationSettings.email.demoRecipients.join("\n")}
                    disabled={!isEmailEditing}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        communicationSettings: {
                          ...current.communicationSettings,
                          email: {
                            ...current.communicationSettings.email,
                            demoRecipients: parseRecipients(event.target.value)
                          }
                        }
                      }))
                    }
                    placeholder="one email per line"
                  />
                </label>
              </div>
            </>
          ) : settings.communicationSettings.email.mode === "live" ? (
            <article className="dashboard-today-card">
              <strong>Live Email routing is locked.</strong>
              <p>No editable settings are shown in Live mode to protect your production setup.</p>
            </article>
          ) : (
            <article className="dashboard-today-card">
              <strong>Email notifications are OFF.</strong>
              <p>Switch to Demo to edit test recipients or switch to Live to use existing routing.</p>
            </article>
          )}
        </article>

        <article className="surface-panel">
          <div className="section-header">
            <div>
              <h2>Telegram Notifications</h2>
              <p>Live keeps your current Telegram routing, Demo sends to test bot/chat, Off disables sends.</p>
            </div>
            <span className="status-chip status-chip-default">{settings.communicationSettings.telegram.mode.toUpperCase()}</span>
          </div>
          <div className="status-button-row">
            {(["off", "live", "demo"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`status-choice-button ${settings.communicationSettings.telegram.mode === mode ? "status-choice-button-active" : ""}`}
                onClick={() => setTelegramMode(mode)}
              >
                {mode === "off" ? "Telegram Off" : mode === "live" ? "Telegram Live" : "Telegram Demo"}
              </button>
            ))}
          </div>
          {settings.communicationSettings.telegram.mode === "demo" ? (
            <>
              <div className="action-row">
                {!isTelegramEditing ? (
                  <button type="button" className="button-secondary" onClick={() => setIsTelegramEditing(true)}>
                    Edit Demo Telegram Settings
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setSettings((current) => ({
                          ...current,
                          communicationSettings: {
                            ...current.communicationSettings,
                            telegram: {
                              ...lastSavedSettings.communicationSettings.telegram
                            }
                          }
                        }));
                        setIsTelegramEditing(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={isPending}
                      onClick={() => {
                        saveCommunicationSettings("Demo Telegram settings saved.");
                        setIsTelegramEditing(false);
                      }}
                    >
                      Save Demo Telegram Settings
                    </button>
                  </>
                )}
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Demo Group Name</span>
                  <input
                    value={settings.communicationSettings.telegram.demoGroupName}
                    disabled={!isTelegramEditing}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        communicationSettings: {
                          ...current.communicationSettings,
                          telegram: {
                            ...current.communicationSettings.telegram,
                            demoGroupName: event.target.value
                          }
                        }
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Demo Chat ID</span>
                  <input
                    value={settings.communicationSettings.telegram.demoChatId}
                    disabled={!isTelegramEditing}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        communicationSettings: {
                          ...current.communicationSettings,
                          telegram: {
                            ...current.communicationSettings.telegram,
                            demoChatId: event.target.value
                          }
                        }
                      }))
                    }
                  />
                </label>
                <label className="field field-wide">
                  <span>Demo Bot Token</span>
                  <div className="secret-field-row">
                    <input
                      type={showDemoBotToken ? "text" : "password"}
                      value={settings.communicationSettings.telegram.demoBotToken}
                      disabled={!isTelegramEditing}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          communicationSettings: {
                            ...current.communicationSettings,
                            telegram: {
                              ...current.communicationSettings.telegram,
                              demoBotToken: event.target.value
                            }
                          }
                        }))
                      }
                      placeholder="Optional: use only for demo mode"
                    />
                    <button
                      type="button"
                      className="secret-toggle-button"
                      disabled={!isTelegramEditing}
                      onClick={() => setShowDemoBotToken((current) => !current)}
                      aria-label={showDemoBotToken ? "Hide demo bot token" : "Show demo bot token"}
                    >
                      {showDemoBotToken ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </div>
            </>
          ) : settings.communicationSettings.telegram.mode === "live" ? (
            <article className="dashboard-today-card">
              <strong>Live Telegram routing is locked.</strong>
              <p>No editable settings are shown in Live mode to protect your production setup.</p>
            </article>
          ) : (
            <article className="dashboard-today-card">
              <strong>Telegram notifications are OFF.</strong>
              <p>Switch to Demo to edit test routing or switch to Live to use existing routing.</p>
            </article>
          )}
          <div className="action-row">
            <button
              className="button-secondary"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    try {
                      const response = await fetch("/api/super-admin/operations/telegram-test", { method: "POST" });
                      const payload = (await response.json()) as { message?: string; error?: string };
                      if (!response.ok) {
                        throw new Error(payload.error ?? "Unable to send test alert.");
                      }
                      setActionState({ tone: "success", message: payload.message ?? "Telegram test sent." });
                    } catch (error) {
                      setActionState({
                        tone: "warning",
                        message: error instanceof Error ? error.message : "Unable to send Telegram test alert."
                      });
                    }
                  })();
                });
              }}
            >
              Send Telegram Test
            </button>
          </div>
        </article>
      </section>

      <section className="surface-panel">
        <div className="section-header">
          <div>
            <h2>Fault Email Templates</h2>
            <p>Paste approved content from Word. Use placeholders like {"{faultRef}"}, {"{trackingToken}"}, {"{officeBearerName}"}, and {"{officeBearerEmail}"}.</p>
          </div>
          <span className="status-chip status-chip-default">Template Manager</span>
        </div>
        <div className="action-row">
          {!isTemplateEditing ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => setIsTemplateEditing(true)}
            >
              Edit Templates
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setSettings((current) => ({
                    ...current,
                    communicationTemplates: { ...lastSavedSettings.communicationTemplates }
                  }));
                  setIsTemplateEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={isPending}
                onClick={() => {
                  saveCommunicationSettings("Fault email templates saved.");
                  setIsTemplateEditing(false);
                }}
              >
                Save Templates
              </button>
            </>
          )}
        </div>
        <div className="status-button-row">
          {templateOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`status-choice-button ${activeTemplateKey === item.key ? "status-choice-button-active" : ""}`}
              onClick={() => setActiveTemplateKey(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <article className="panel-card">
          <div className="panel-head">
            <h3>{templateOptions.find((item) => item.key === activeTemplateKey)?.label}</h3>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={activeTemplate.enabled}
                disabled={!isTemplateEditing}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    communicationTemplates: {
                      ...current.communicationTemplates,
                      [activeTemplateKey]: {
                        ...current.communicationTemplates[activeTemplateKey],
                        enabled: event.target.checked
                      }
                    }
                  }))
                }
              />
              <span>Template Enabled</span>
            </label>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Subject Template</span>
              <input
                value={activeTemplate.subjectTemplate}
                disabled={!isTemplateEditing}
                onFocus={() => setActiveTemplateField("subjectTemplate")}
                onChange={(event) => updateActiveTemplateField("subjectTemplate", event.target.value)}
              />
            </label>
            <label className="field field-wide">
              <span>Body Template</span>
              <textarea
                rows={8}
                value={activeTemplate.bodyTemplate}
                disabled={!isTemplateEditing}
                onFocus={() => setActiveTemplateField("bodyTemplate")}
                onChange={(event) => updateActiveTemplateField("bodyTemplate", event.target.value)}
              />
            </label>
            <label className="field field-wide">
              <span>Email Signature</span>
              <textarea
                rows={4}
                value={activeTemplate.signature}
                disabled={!isTemplateEditing}
                onFocus={() => setActiveTemplateField("signature")}
                onChange={(event) => updateActiveTemplateField("signature", event.target.value)}
              />
            </label>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-head">
            <h3>Template Token Helper</h3>
            <span className="status-chip status-chip-default">Insert into active field</span>
          </div>
          <div className="status-button-row">
            {templateTokenHelp.map((token) => (
              <button
                key={token}
                type="button"
                className="button-secondary"
                onClick={() => insertToken(token)}
                disabled={!isTemplateEditing}
              >
                {token}
              </button>
            ))}
          </div>
          <p>Active field: <strong>{activeTemplateField}</strong></p>
        </article>

        <article className="panel-card">
          <div className="panel-head">
            <h3>Live Preview (Sample Data)</h3>
            <span className="status-chip status-chip-success">Preview</span>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Preview Subject</span>
              <input value={replaceTemplateTokens(activeTemplate.subjectTemplate)} readOnly />
            </label>
            <label className="field field-wide">
              <span>Preview Body</span>
              <textarea rows={8} value={replaceTemplateTokens(activeTemplate.bodyTemplate)} readOnly />
            </label>
            <label className="field field-wide">
              <span>Preview Signature</span>
              <textarea rows={4} value={replaceTemplateTokens(activeTemplate.signature)} readOnly />
            </label>
          </div>
        </article>
      </section>
    </>
  );
}
