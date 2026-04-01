"use client";

import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { PlannerCalendarItem } from "@/lib/google-calendar";
import type {
  Donation,
  Donor,
  GlobalSearchItem,
  PlatformSettings,
  PRComm,
  ProEventCampaignItem,
  SessionUser,
  SocialCalendarItem
} from "@/types/domain";

type ProConsoleProps = {
  initialPRComms: PRComm[];
  socialCalendar: SocialCalendarItem[];
  internationalObservances: SocialCalendarItem[];
  plannerEvents: PlannerCalendarItem[];
  eventCampaigns: ProEventCampaignItem[];
  wordpress: PlatformSettings["wordpress"];
  donors: Donor[];
  donations: Donation[];
  currentUser: SessionUser;
  mode?: "overview" | "donors";
  focusPRId?: string;
  focusQueue?: string;
  focusAction?: string;
  contextMessage?: string;
};

const defaultForm = {
  headline: "",
  body: "",
  channel: "email",
  mediaRefs: [""] as string[]
};

type HolidayFormState = {
  holidayName: string;
  date: string;
  category: "International Holiday" | "Important Observation Day";
  description: string;
};

type EventCampaignFormState = {
  name: string;
  plannedDate: string;
  description: string;
  plan: string;
};

const defaultHolidayForm = {
  holidayName: "",
  date: "",
  category: "International Holiday",
  description: ""
} satisfies HolidayFormState;

const defaultEventCampaignForm = {
  name: "",
  plannedDate: "",
  description: "",
  plan: ""
} satisfies EventCampaignFormState;

function getCategoryTone(category: string) {
  if (category === "SA Public Holiday") return "warning";
  if (category === "International Holiday") return "success";
  return "default";
}

function getHolidayBadgeLabel(category: string) {
  if (category === "South African Public Holiday") return "SA Public Holiday";
  return category;
}

export function ProConsole({
  initialPRComms,
  socialCalendar,
  internationalObservances,
  plannerEvents,
  eventCampaigns,
  wordpress,
  donors,
  donations,
  currentUser,
  mode = "overview",
  focusPRId,
  focusQueue,
  focusAction,
  contextMessage
}: ProConsoleProps) {
  const [prItems, setPrItems] = useState(initialPRComms);
  const [form, setForm] = useState(defaultForm);
  const [holidayForm, setHolidayForm] = useState(defaultHolidayForm);
  const [eventCampaignForm, setEventCampaignForm] = useState(defaultEventCampaignForm);
  const [plannerInternationalItems, setPlannerInternationalItems] = useState(internationalObservances);
  const [eventsCampaigns, setEventsCampaigns] = useState(eventCampaigns);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isHolidaySaving, setIsHolidaySaving] = useState(false);
  const [isWordpressBusy, setIsWordpressBusy] = useState(false);
  const [isDraftingHighlighted, setIsDraftingHighlighted] = useState(false);
  const [isHolidayFormOpen, setIsHolidayFormOpen] = useState(false);
  const [isEventCampaignFormOpen, setIsEventCampaignFormOpen] = useState(false);
  const [wordpressCategoryById, setWordpressCategoryById] = useState<Record<string, string>>({});
  const firstApprovalItem = prItems.find((item) => item.status === "pending-approval" || item.status === "approved");
  const [highlightedPRId, setHighlightedPRId] = useState(focusPRId ?? initialPRComms[0]?.id ?? "");
  const jumpTargetId = highlightedPRId ? `pro-focus-${highlightedPRId}` : "";
  const isOverview = mode === "overview";
  const pendingEventCampaigns = eventsCampaigns.filter((item) => item.status === "pending-approval");
  const approvedEventCampaigns = eventsCampaigns.filter((item) => item.status === "approved");
  const pageTitle = isOverview ? "PRO Hub" : "Donors";
  const pageDescription = isOverview
    ? "The Public Relations Officers Communication Playground."
    : "Keep donor relationships, interests, and contribution history visible in one focused workspace.";

  const searchItems: GlobalSearchItem[] = [
    ...prItems.map((item) => ({
      id: item.id,
      title: item.headline,
      subtitle: [item.channel, item.status, `${item.appCount} approvals`].join(" • "),
      kind: "communication" as const,
      keywords: [item.body]
    })),
    ...(mode === "donors"
      ? donors.map((donor) => ({
          id: `donor-${donor.id}`,
          title: donor.name,
          subtitle: [donor.tier, donor.email].join(" • "),
          kind: "donor" as const,
          keywords: [donor.interests]
        }))
      : []),
    ...socialCalendar.map((item) => ({
      id: `calendar-${item.id}`,
      title: item.holidayName,
      subtitle: [item.category, new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA")].join(" • "),
      kind: "communication" as const,
      keywords: [item.postPlan]
    })),
    ...plannerInternationalItems.map((item) => ({
      id: `international-${item.id}`,
      title: item.holidayName,
      subtitle: [item.category, new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA")].join(" • "),
      kind: "communication" as const,
      keywords: [item.postPlan]
    })),
    ...plannerEvents.map((item) => ({
      id: `planner-event-${item.id}`,
      title: item.title,
      subtitle: [item.dateLabel, item.location ?? "Shared calendar"].join(" • "),
      kind: "communication" as const,
      href: item.href,
      keywords: [item.location ?? ""]
    })),
    ...eventsCampaigns.map((item) => ({
      id: `event-campaign-${item.id}`,
      title: item.name,
      subtitle: [new Date(`${item.plannedDate}T00:00:00`).toLocaleDateString("en-ZA"), item.status, `${item.appCount} approvals`].join(" • "),
      kind: "communication" as const,
      keywords: [item.description, item.plan]
    }))
  ];

  useEffect(() => {
    setPlannerInternationalItems(internationalObservances);
  }, [internationalObservances]);

  useEffect(() => {
    setEventsCampaigns(eventCampaigns);
  }, [eventCampaigns]);

  useEffect(() => {
    setWordpressCategoryById((current) => {
      const next = { ...current };
      prItems.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = wordpress.defaultCategory;
        }
      });
      return next;
    });
  }, [prItems, wordpress.defaultCategory]);

  useEffect(() => {
    if (focusPRId) {
      setHighlightedPRId(focusPRId);
      return;
    }

    if (focusQueue === "approvals" && initialPRComms[0]) {
      setHighlightedPRId(firstApprovalItem?.id ?? initialPRComms[0].id);
    }
  }, [firstApprovalItem?.id, focusPRId, focusQueue, initialPRComms]);

  useEffect(() => {
    if (!contextMessage || !jumpTargetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contextMessage, jumpTargetId]);

  async function createDraft() {
    setIsBusy(true);
    setMessage(null);

    try {
      const mediaRefs = form.mediaRefs.map((item) => item.trim()).filter(Boolean);
      const response = await fetch("/api/pr-comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mediaRefs
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create communication.");
      }

      setPrItems((current) => [payload.item, ...current]);
      setForm(defaultForm);
      setMessage("Communication draft created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create communication.");
    } finally {
      setIsBusy(false);
    }
  }

  function openDraftingSection() {
    setIsDraftingHighlighted(true);
    window.setTimeout(() => {
      document.getElementById("pro-drafting-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    window.setTimeout(() => {
      setIsDraftingHighlighted(false);
    }, 2200);
  }

  function openEventCampaignSection() {
    setIsEventCampaignFormOpen(true);
    window.setTimeout(() => {
      document.getElementById("pro-events-campaigns")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function approveItem(id: string) {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/pr-comms/${id}/approve`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to approve communication.");
      }

      setPrItems((current) => current.map((item) => (item.id === payload.id ? payload : item)));
      setMessage("Approval recorded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve communication.");
    } finally {
      setIsBusy(false);
    }
  }

  async function sendItem(id: string) {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/pr-comms/${id}/send`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send communication.");
      }

      setPrItems((current) => current.map((item) => (item.id === payload.id ? payload : item)));
      setMessage("Communication marked as sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send communication.");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveCustomHoliday() {
    setIsHolidaySaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/social-calendar/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidayForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save holiday.");
      }

      const nextItems = [...plannerInternationalItems, payload.item as SocialCalendarItem].sort((left, right) =>
        left.date.localeCompare(right.date)
      );
      setPlannerInternationalItems(nextItems);
      setHolidayForm(defaultHolidayForm);
      setIsHolidayFormOpen(false);
      setMessage("Holiday added to the planner.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save holiday.");
    } finally {
      setIsHolidaySaving(false);
    }
  }

  async function saveEventCampaign() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/pro/events-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventCampaignForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save event or campaign.");
      }

      setEventsCampaigns((current) => [payload.item as ProEventCampaignItem, ...current]);
      setEventCampaignForm(defaultEventCampaignForm);
      setIsEventCampaignFormOpen(false);
      setMessage("Event or campaign saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save event or campaign.");
    } finally {
      setIsBusy(false);
    }
  }

  async function approveEventCampaign(id: string) {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/pro/events-campaigns/${id}/approve`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to approve event or campaign.");
      }

      setEventsCampaigns((current) => current.map((item) => (item.id === payload.item.id ? payload.item : item)));
      setMessage(payload.item.status === "approved" ? "Event approved and added to the shared calendar." : "Approval recorded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve event or campaign.");
    } finally {
      setIsBusy(false);
    }
  }

  async function publishToWordPress(id: string) {
    setIsWordpressBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/pro/wordpress/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prCommId: id,
          category: wordpressCategoryById[id] ?? wordpress.defaultCategory
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to publish to WordPress.");
      }

      setPrItems((current) => current.map((item) => (item.id === payload.item.id ? payload.item : item)));
      setMessage(
        payload.wordpress?.url
          ? `Published to WordPress. Open post: ${payload.wordpress.url}`
          : "Published to WordPress successfully."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish to WordPress.");
    } finally {
      setIsWordpressBusy(false);
    }
  }

  function prefillHolidayDraft(item: SocialCalendarItem) {
    setForm({
      headline: item.holidayName,
      body: "",
      channel: "whatsapp",
      mediaRefs: [""]
    });
    setMessage(`Drafting template loaded for ${item.holidayName}.`);
    openDraftingSection();
  }

  function updateMediaRef(index: number, value: string) {
    setForm((current) => ({
      ...current,
      mediaRefs: current.mediaRefs.map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addMediaSlot() {
    setForm((current) => {
      if (current.mediaRefs.length >= 4) {
        return current;
      }

      return {
        ...current,
        mediaRefs: [...current.mediaRefs, ""]
      };
    });
  }

  function removeMediaSlot(index: number) {
    setForm((current) => {
      if (current.mediaRefs.length === 1) {
        return {
          ...current,
          mediaRefs: [""]
        };
      }

      return {
        ...current,
        mediaRefs: current.mediaRefs.filter((_, itemIndex) => itemIndex !== index)
      };
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              if (item.id.startsWith("donor-")) {
                window.setTimeout(() => {
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 80);
                return;
              }

              if (item.id.startsWith("calendar-") || item.id.startsWith("international-")) {
                window.setTimeout(() => {
                  document.getElementById("pro-social-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 80);
                return;
              }

              if (item.id.startsWith("event-campaign-")) {
                window.setTimeout(() => {
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 80);
                return;
              }

              if (item.id.startsWith("planner-event-")) {
                if (item.href) {
                  window.open(item.href, "_blank", "noopener,noreferrer");
                }
                return;
              }

              setHighlightedPRId(item.id);
              window.setTimeout(() => {
                document.getElementById(`pro-focus-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 80);
            }}
          />
          {isOverview ? (
            <div className="pro-header-actions">
              <button className="button-primary" type="button" onClick={() => setIsHolidayFormOpen((current) => !current)}>
                Add Holiday
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={openEventCampaignSection}
              >
                Add Event or Campaign
              </button>
              <button className="button-primary" type="button" onClick={openDraftingSection} disabled={isBusy}>
                {isBusy ? "Working..." : "Create Draft"}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {message ? (
        <section className="flash-panel flash-panel-success">
          <strong>{message}</strong>
        </section>
      ) : null}

      {contextMessage ? (
        <section className="flash-panel flash-panel-default dashboard-context-banner dashboard-context-banner-sticky">
          <div className="panel-head">
            <strong>Opened from Admin Dashboard</strong>
            <button className="button-secondary" type="button" onClick={() => document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Jump to item
            </button>
          </div>
          <p>{contextMessage}</p>
          {focusAction ? <span className="tag">Next action: {focusAction}</span> : null}
        </section>
      ) : null}

      {isOverview ? (
        <section className="dashboard-feature-grid">
          <article
            id="pro-drafting-section"
            className={`surface-panel clean-marine-panel${isDraftingHighlighted ? " dashboard-context-highlight" : ""}`}
          >
            <div className="section-header">
              <div>
                <h2>Communication Drafting</h2>
                <p>Create content for email, website, WhatsApp, or social channels and push it into the approval flow.</p>
              </div>
              <span className="status-chip status-chip-success">Live Drafting</span>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Headline</span>
                <input value={form.headline} onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))} />
              </label>
              <label className="field field-wide">
                <span>Communication Channel</span>
                <select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="media-statement">Media Statement</option>
                </select>
              </label>
              <div className="field field-wide">
                <div className="panel-head">
                  <span>Upload Media</span>
                  {form.mediaRefs.length < 4 ? (
                    <button className="button-secondary" type="button" onClick={addMediaSlot}>
                      +
                    </button>
                  ) : null}
                </div>
                <p style={{ margin: "0.25rem 0 0.6rem" }}>
                  For WordPress posts, paste a public image/file URL here. Local file picks are saved as labels only.
                </p>
                <div className="dashboard-stack">
                  {form.mediaRefs.map((mediaRef, index) => (
                    <div key={`media-ref-${index}`} className="dashboard-actions-row">
                      <input
                        value={mediaRef}
                        onChange={(event) => updateMediaRef(index, event.target.value)}
                        placeholder="https://... (public media URL)"
                      />
                      <input type="file" onChange={(event) => updateMediaRef(index, event.target.files?.[0]?.name ?? "")} />
                      {mediaRef ? <span className="tag">{mediaRef}</span> : null}
                      {form.mediaRefs.length > 1 ? (
                        <button className="button-secondary" type="button" onClick={() => removeMediaSlot(index)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <label className="field field-wide">
                <span>Body</span>
                <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={5} />
              </label>
            </div>
            <div className="dashboard-actions-row" style={{ marginTop: "1rem" }}>
              <button className="button-primary" type="button" onClick={createDraft} disabled={isBusy}>
                {isBusy ? "Working..." : "Save Draft"}
              </button>
            </div>
          </article>

          <article id="pro-events-campaigns" className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div style={{ paddingBottom: "0.35rem" }}>
                <h2>Draft Approval Queue</h2>
                <p>Communication drafts awaiting approval. 2 Admins need to approve.</p>
              </div>
              <span className="status-chip status-chip-warning">Workflow</span>
            </div>

            <div className="dashboard-stack">
              {prItems.map((item) => (
                <article key={item.id} id={`pro-focus-${item.id}`} className={`dashboard-approval-card${highlightedPRId === item.id ? " dashboard-context-highlight" : ""}`}>
                  <div className="panel-head">
                    <div>
                      <h3>{item.headline}</h3>
                      <p>{item.body}</p>
                    </div>
                    <span className={`status-chip status-chip-${item.status === "sent" ? "success" : item.status === "approved" ? "default" : "warning"}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="tag">Communication Channel: {item.channel}</span>
                    <span className="tag">Approvals: {item.appCount}</span>
                    {item.createdByName ? <span className="tag">Drafted by: {item.createdByName}</span> : null}
                    {item.mediaRefs?.length ? <span className="tag">Media: {item.mediaRefs.length}</span> : null}
                    {item.wordpressPostId ? <span className="tag">WordPress Post ID: {item.wordpressPostId}</span> : null}
                    {item.wordpressPostUrl ? (
                      <a className="tag" href={item.wordpressPostUrl} target="_blank" rel="noreferrer">
                        Open WordPress Post
                      </a>
                    ) : null}
                  </div>
                  {item.mediaRefs?.length ? (
                    <div className="meta-row">
                      {item.mediaRefs.map((mediaRef) => (
                        <span key={`${item.id}-${mediaRef}`} className="tag">
                          {mediaRef}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="dashboard-actions-row">
                    <button
                      className={`button-secondary${highlightedPRId === item.id && focusAction === "approve" ? " dashboard-action-highlight-secondary" : ""}`}
                      type="button"
                      onClick={() => approveItem(item.id)}
                      disabled={
                        isBusy ||
                        item.status === "sent" ||
                        currentUser.role === "PRO" ||
                        (item.createdByEmail?.toLowerCase() ?? "") === currentUser.email.toLowerCase()
                      }
                    >
                      Approve
                    </button>
                    <button className="button-primary" type="button" onClick={() => sendItem(item.id)} disabled={isBusy || item.status !== "approved"}>
                      Send
                    </button>
                    <select
                      value={wordpressCategoryById[item.id] ?? wordpress.defaultCategory}
                      onChange={(event) =>
                        setWordpressCategoryById((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      disabled={!wordpress.enabled || isWordpressBusy || item.status !== "approved"}
                    >
                      {wordpress.categories.map((category) => (
                        <option key={`wp-cat-${item.id}-${category}`} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => publishToWordPress(item.id)}
                      disabled={!wordpress.enabled || isWordpressBusy || item.status !== "approved"}
                    >
                      {isWordpressBusy ? "Publishing..." : "Publish Live to WordPress"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {isOverview ? (
        <section id="pro-social-planner" className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Social Planner</h2>
                <p>Shared-calendar events and curated annual observances stay visible so the PRO can plan content and approvals early.</p>
              </div>
              <span className="status-chip status-chip-default">Calendar</span>
            </div>
            <div className="dashboard-stack">
              <article className="dashboard-minute-card">
                <div className="panel-head">
                  <strong>Shared Calendar Feed</strong>
                  <span className="status-chip status-chip-success">{plannerEvents.length} upcoming</span>
                </div>
                <p>Live events from the connected shared calendar now sit alongside the annual community planner.</p>
              </article>
              {plannerEvents.length > 0 ? (
                plannerEvents.map((item) => (
                  <article key={item.id} className="dashboard-minute-card">
                    <div className="panel-head">
                      <strong>{item.title}</strong>
                      <span className="status-chip status-chip-default">Shared Calendar</span>
                    </div>
                    <p>{item.dateLabel}</p>
                    <div className="meta-row">
                      {item.location ? <span className="tag">{item.location}</span> : null}
                      <a className="tag" href={item.href} target="_blank" rel="noreferrer">
                        Open event
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-minute-card">
                  <strong>No shared calendar events are available yet.</strong>
                </article>
              )}

              <article className="dashboard-minute-card">
                <h3>Upcoming Public Holidays and International Observance Days</h3>
                <p>Public Relations Officer to create content for these upcoming holidays. Plan 2 weeks in advance.</p>
              </article>

              {isHolidayFormOpen ? (
                <article className="dashboard-minute-card">
                  <div className="section-header">
                    <div>
                      <h3>Add Holiday</h3>
                      <p>Add a custom observance like Eid or Diwali to the planner and shared calendar.</p>
                    </div>
                    <span className="status-chip status-chip-default">Planner</span>
                  </div>
                  <div className="form-grid">
                    <label className="field field-wide">
                      <span>Holiday Name</span>
                      <input
                        value={holidayForm.holidayName}
                        onChange={(event) => setHolidayForm((current) => ({ ...current, holidayName: event.target.value }))}
                      />
                    </label>
                    <label className="field field-wide">
                      <span>Holiday Type</span>
                      <select
                        value={holidayForm.category}
                        onChange={(event) =>
                          setHolidayForm((current) => ({
                            ...current,
                            category: event.target.value as typeof defaultHolidayForm.category
                          }))
                        }
                      >
                        <option value="International Holiday">International Holiday</option>
                        <option value="Important Observation Day">Important Observation Day</option>
                      </select>
                    </label>
                    <label className="field field-wide">
                      <span>Date</span>
                      <input
                        type="date"
                        value={holidayForm.date}
                        onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))}
                      />
                    </label>
                    <label className="field field-wide">
                      <span>Description</span>
                      <textarea
                        rows={4}
                        value={holidayForm.description}
                        onChange={(event) => setHolidayForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="dashboard-actions-row" style={{ marginTop: "1rem" }}>
                    <button className="button-primary" type="button" onClick={saveCustomHoliday} disabled={isHolidaySaving}>
                      {isHolidaySaving ? "Saving..." : "Add Holiday"}
                    </button>
                    <button className="button-secondary" type="button" onClick={() => setIsHolidayFormOpen(false)} disabled={isHolidaySaving}>
                      Cancel
                    </button>
                  </div>
                </article>
              ) : null}

              {socialCalendar.map((item) => {
                const [dateLine, description] = item.postPlan.split("|||");

                return (
                  <article key={item.id} className="dashboard-minute-card">
                    <div className="panel-head">
                      <strong>{item.holidayName}</strong>
                      <div className="meta-row">
                        <span className={`status-chip status-chip-${getCategoryTone(getHolidayBadgeLabel(item.category))}`}>
                          {getHolidayBadgeLabel(item.category)}
                        </span>
                        <span className="status-chip status-chip-default">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA")}</span>
                      </div>
                    </div>
                    <p>{dateLine}</p>
                    {description ? <p>{description}</p> : null}
                    <div className="dashboard-actions-row">
                      <button className="button-secondary" type="button" onClick={() => prefillHolidayDraft(item)}>
                        Create Draft
                      </button>
                    </div>
                  </article>
                );
              })}

              {plannerInternationalItems.map((item) => {
                const [dateLine, description] = item.postPlan.split("|||");
                const badgeLabel = getHolidayBadgeLabel(item.category);

                return (
                  <article key={item.id} className="dashboard-minute-card">
                    <div className="panel-head">
                      <strong>{item.holidayName}</strong>
                      <div className="meta-row">
                        <span className={`status-chip status-chip-${getCategoryTone(badgeLabel)}`}>{badgeLabel}</span>
                        <span className="status-chip status-chip-default">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-ZA")}</span>
                      </div>
                    </div>
                    <p>{dateLine}</p>
                    {description ? <p>{description}</p> : null}
                    <div className="dashboard-actions-row">
                      <button className="button-secondary" type="button" onClick={() => prefillHolidayDraft(item)}>
                        Create Draft
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Events and Campaigns</h2>
                <p>Upcoming activations, awareness drives, and campaigns.</p>
              </div>
              <span className="status-chip status-chip-default">Planning</span>
            </div>
            <div className="dashboard-stack">
              {isEventCampaignFormOpen ? (
                <article className="dashboard-minute-card">
                  <div className="section-header">
                    <div>
                      <h3>Add Event or Campaign</h3>
                      <p>Capture the campaign basics and outline the action plan before production starts.</p>
                    </div>
                    <span className="status-chip status-chip-default">Planner</span>
                  </div>
                  <div className="form-grid">
                    <label className="field field-wide">
                      <span>Name of Event or Campaign</span>
                      <input
                        value={eventCampaignForm.name}
                        onChange={(event) =>
                          setEventCampaignForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field field-wide">
                      <span>Planned Date</span>
                      <input
                        type="date"
                        value={eventCampaignForm.plannedDate}
                        onChange={(event) =>
                          setEventCampaignForm((current) => ({ ...current, plannedDate: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field field-wide">
                      <span>Description</span>
                      <textarea
                        rows={4}
                        value={eventCampaignForm.description}
                        onChange={(event) =>
                          setEventCampaignForm((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field field-wide">
                      <span>What is the plan</span>
                      <textarea
                        rows={5}
                        placeholder="Who, What, how, when and Why?"
                        value={eventCampaignForm.plan}
                        onChange={(event) =>
                          setEventCampaignForm((current) => ({ ...current, plan: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="dashboard-actions-row" style={{ marginTop: "1rem" }}>
                    <button className="button-primary" type="button" onClick={saveEventCampaign} disabled={isBusy}>
                      {isBusy ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => {
                        setEventCampaignForm(defaultEventCampaignForm);
                        setIsEventCampaignFormOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </article>
              ) : null}
              <article className="dashboard-minute-card">
                <div className="panel-head">
                  <strong>Events and Campaign Approval Queue</strong>
                  <span className="status-chip status-chip-warning">{pendingEventCampaigns.length} awaiting approval</span>
                </div>
                <p>Events and campaigns stay here until 5 admins have approved them.</p>
              </article>
              {pendingEventCampaigns.length > 0 ? (
                pendingEventCampaigns.map((item) => (
                  <article key={item.id} id={`event-campaign-${item.id}`} className="dashboard-minute-card">
                    <div className="panel-head">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                      </div>
                      <span className="status-chip status-chip-warning">
                        {item.appCount}/5 approvals
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="tag">{new Date(`${item.plannedDate}T00:00:00`).toLocaleDateString("en-ZA")}</span>
                      {item.createdByName ? <span className="tag">Created by: {item.createdByName}</span> : null}
                    </div>
                    <div>
                      <strong>What is the plan</strong>
                      <p>{item.plan}</p>
                    </div>
                    <div className="dashboard-actions-row">
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => approveEventCampaign(item.id)}
                        disabled={
                          isBusy ||
                          currentUser.role === "PRO" ||
                          (item.createdByEmail?.toLowerCase() ?? "") === currentUser.email.toLowerCase()
                        }
                      >
                        Approve
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-minute-card">
                  <strong>No events or campaigns are waiting for approval.</strong>
                </article>
              )}
              <article className="dashboard-minute-card">
                <div className="panel-head">
                  <strong>Upcoming Events</strong>
                  <span className="status-chip status-chip-success">{approvedEventCampaigns.length} approved</span>
                </div>
                <p>Approved items move here, sync to the shared calendar, and send admin invites automatically.</p>
              </article>
              {approvedEventCampaigns.length > 0 ? (
                approvedEventCampaigns.map((item) => (
                  <article key={`${item.id}-approved`} id={`event-campaign-${item.id}`} className="dashboard-minute-card">
                    <div className="panel-head">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                      </div>
                      <span className="status-chip status-chip-success">
                        {new Date(`${item.plannedDate}T00:00:00`).toLocaleDateString("en-ZA")}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="tag">Approvals: {item.appCount}/5</span>
                      {item.calendarEventLink ? (
                        <a className="tag" href={item.calendarEventLink} target="_blank" rel="noreferrer">
                          Open calendar event
                        </a>
                      ) : null}
                    </div>
                    <div>
                      <strong>What is the plan</strong>
                      <p>{item.plan}</p>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-minute-card">
                  <strong>No approved upcoming events yet.</strong>
                </article>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {mode === "donors" ? (
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Donors</h2>
              <p>Keep donor relationships visible from one focused workspace.</p>
            </div>
            <span className="status-chip status-chip-success">Visible</span>
          </div>
          <div className="dashboard-stack">
            {donors.map((donor) => (
              <article key={donor.id} id={`donor-${donor.id}`} className="dashboard-minute-card">
                <div className="panel-head">
                  <strong>{donor.name}</strong>
                  <span className="status-chip status-chip-success">{donor.tier}</span>
                </div>
                <p>{donor.interests}</p>
                <div className="meta-row">
                  <span className="tag">{donor.email}</span>
                  <span className="tag">Donations: {donations.filter((item) => item.donorId === donor.id).length}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </>
  );
}
