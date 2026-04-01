"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InboxItem = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unread: boolean;
  starred?: boolean;
  actionedByName?: string;
  actionType?: "reply" | "forward" | "delete" | "flag" | null;
  assignedToName?: string;
  assignedToEmail?: string;
  workflowStatus?:
    | "open"
    | "actioned"
    | "ignored"
    | "to-be-deleted"
    | "needs-response"
    | "waiting-external"
    | "assigned-to-councillor";
};

type InboxMessage = {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  textBody: string;
  htmlBody?: string;
  unread: boolean;
  starred?: boolean;
  actionedByName?: string;
  actionType?: "reply" | "forward" | "delete" | "flag" | null;
  assignedToName?: string;
  assignedToEmail?: string;
  workflowStatus?:
    | "open"
    | "actioned"
    | "ignored"
    | "to-be-deleted"
    | "needs-response"
    | "waiting-external"
    | "assigned-to-councillor";
};

type AdminOption = {
  email: string;
  name: string;
};

type ContactOption = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

type CalendarItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  href?: string;
  isAllDay: boolean;
};

type ComposeMode = "reply" | "forward" | null;
type CalendarView = "month" | "week" | "day";
type MailViewMode = "focused" | "all";

function parseMailboxAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  return value.trim();
}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getActionMeta(item: InboxItem) {
  if (item.actionType === "reply") {
    return { label: `Replied by ${item.actionedByName || "Admin"}`, tone: "success" as const };
  }
  if (item.actionType === "forward") {
    return { label: `Forwarded by ${item.actionedByName || "Admin"}`, tone: "info" as const };
  }
  if (item.actionType === "delete") {
    return { label: `Deleted by ${item.actionedByName || "Admin"}`, tone: "danger" as const };
  }
  if (item.actionType === "flag") {
    return { label: `Flagged by ${item.actionedByName || "Admin"}`, tone: "info" as const };
  }
  if (item.actionedByName) {
    return { label: `Viewed by ${item.actionedByName}`, tone: "default" as const };
  }
  return null;
}

function getWorkflowMeta(
  status: InboxItem["workflowStatus"]
): { label: string; tone: "default" | "success" | "warning" | "danger" | "info" } {
  if (status === "actioned") return { label: "Actioned", tone: "success" };
  if (status === "ignored") return { label: "Ignored", tone: "warning" };
  if (status === "to-be-deleted") return { label: "To Be Deleted", tone: "danger" };
  if (status === "needs-response") return { label: "Needs Response", tone: "info" };
  if (status === "waiting-external") return { label: "Waiting External", tone: "default" };
  if (status === "assigned-to-councillor") return { label: "Assigned to Councillor", tone: "info" };
  return { label: "Open", tone: "default" };
}

export function HelloInboxConsole() {
  const [mailFolder, setMailFolder] = useState<"inbox" | "sent" | "junk" | "deleted" | "flagged">("inbox");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mailboxPageToken, setMailboxPageToken] = useState<string | null>(null);
  const [mailboxTokenHistory, setMailboxTokenHistory] = useState<string[]>([]);
  const [nextMailboxPageToken, setNextMailboxPageToken] = useState<string | null>(null);
  const [mailViewMode, setMailViewMode] = useState<MailViewMode>("all");
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [adminOptions, setAdminOptions] = useState<AdminOption[]>([]);
  const [assignmentEmail, setAssignmentEmail] = useState("");
  const [assignmentName, setAssignmentName] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<
    | "open"
    | "actioned"
    | "ignored"
    | "to-be-deleted"
    | "needs-response"
    | "waiting-external"
    | "assigned-to-councillor"
  >("open");
  const [contactQuery, setContactQuery] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(toDateInputValue());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isSavingCalendarEvent, setIsSavingCalendarEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(toDateInputValue());
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const unreadCount = items.filter((item) => item.unread).length;
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.subject, item.from, item.snippet, item.date].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);
  const visibleItems = useMemo(() => {
    if (mailViewMode === "all") {
      return filteredItems;
    }

    return filteredItems.filter((item) => {
      const status = item.workflowStatus ?? "open";
      return (
        item.unread ||
        status === "open" ||
        status === "needs-response" ||
        status === "waiting-external" ||
        status === "assigned-to-councillor"
      );
    });
  }, [filteredItems, mailViewMode]);
  const selectedListItem = visibleItems.find((item) => item.id === selectedId) ?? null;

  const loadInbox = useCallback(async (targetToken?: string | null, resetHistory = false, folder?: typeof mailFolder) => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: "20",
        folder: folder ?? mailFolder
      });
      if (targetToken) {
        query.set("pageToken", targetToken);
      }
      const response = await fetch(`/api/mailbox?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as { items?: InboxItem[]; nextPageToken?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load inbox.");
      }
      const nextItems = payload.items ?? [];
      setItems(nextItems);
      setMailboxPageToken(targetToken ?? null);
      setNextMailboxPageToken(payload.nextPageToken ?? null);
      if (resetHistory) {
        setMailboxTokenHistory([]);
      }
      setSelectedId((current) => (nextItems.some((item) => item.id === current) ? current : (nextItems[0]?.id ?? "")));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inbox.");
    } finally {
      setIsLoading(false);
    }
  }, [mailFolder]);

  const loadCalendar = useCallback(async () => {
    setIsCalendarLoading(true);
    setCalendarMessage(null);
    try {
      const response = await fetch(
        `/api/mailbox/calendar?view=${encodeURIComponent(calendarView)}&anchor=${encodeURIComponent(calendarAnchorDate)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as { items?: CalendarItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load shared calendar.");
      }
      setCalendarItems(payload.items ?? []);
    } catch (loadError) {
      setCalendarMessage(loadError instanceof Error ? loadError.message : "Unable to load shared calendar.");
    } finally {
      setIsCalendarLoading(false);
    }
  }, [calendarAnchorDate, calendarView]);

  useEffect(() => {
    void loadInbox(null, true);
  }, [loadInbox]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingContacts(true);
    setContactsError(null);

    void (async () => {
      try {
        const query = new URLSearchParams({
          limit: "25",
          q: contactQuery
        });
        const response = await fetch(`/api/mailbox/contacts?${query.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as { items?: ContactOption[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load contacts.");
        }
        if (!cancelled) {
          setContacts(payload.items ?? []);
        }
      } catch (contactError) {
        if (!cancelled) {
          setContactsError(contactError instanceof Error ? contactError.message : "Unable to load contacts.");
          setContacts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingContacts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contactQuery]);

  useEffect(() => {
    void loadInbox(null, true, mailFolder);
  }, [loadInbox, mailFolder]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/mailbox/admins", { cache: "no-store" });
        const payload = (await response.json()) as { items?: AdminOption[] };
        if (!response.ok || cancelled) {
          return;
        }
        setAdminOptions(payload.items ?? []);
      } catch {
        // Ignore transient loading errors for admin options.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedMessage(null);
      return;
    }

    let cancelled = false;
    setIsLoadingMessage(true);
    setActionMessage(null);

    void (async () => {
      try {
        const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedId)}`, { cache: "no-store" });
        const payload = (await response.json()) as { item?: InboxMessage; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load message.");
        }
        if (!cancelled) {
          setSelectedMessage(payload.item ?? null);
          setAssignmentEmail(payload.item?.assignedToEmail ?? "");
          setAssignmentName(payload.item?.assignedToName ?? "");
          setWorkflowStatus(payload.item?.workflowStatus ?? "open");
        }
      } catch (messageError) {
        if (!cancelled) {
          setError(messageError instanceof Error ? messageError.message : "Unable to load message.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessage(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function openNextInboxPage() {
    if (!nextMailboxPageToken || isLoading) return;
    const currentToken = mailboxPageToken ?? "";
    setMailboxTokenHistory((current) => [...current, currentToken]);
    await loadInbox(nextMailboxPageToken);
  }

  async function openPreviousInboxPage() {
    if (mailboxTokenHistory.length === 0 || isLoading) return;
    const previousHistory = [...mailboxTokenHistory];
    const previousToken = previousHistory.pop() ?? "";
    setMailboxTokenHistory(previousHistory);
    await loadInbox(previousToken || null);
  }

  function openCompose(mode: ComposeMode) {
    if (!selectedMessage || !mode) return;
    const originalSubject = selectedMessage.subject || "(No subject)";
    const subjectPrefix = mode === "reply" ? (originalSubject.toLowerCase().startsWith("re:") ? "" : "Re: ") : (originalSubject.toLowerCase().startsWith("fwd:") ? "" : "Fwd: ");
    setComposeMode(mode);
    setComposeTo(mode === "reply" ? parseMailboxAddress(selectedMessage.from) : "");
    setComposeSubject(`${subjectPrefix}${originalSubject}`);
    setComposeBody(mode === "forward" ? `\n\n---------- Forwarded message ----------\nFrom: ${selectedMessage.from}\nDate: ${selectedMessage.date}\nSubject: ${selectedMessage.subject}\nTo: ${selectedMessage.to}\n\n${selectedMessage.textBody || selectedMessage.snippet || ""}` : "");
  }

  async function assignSelectedMessage() {
    if (!selectedMessage || !assignmentEmail || !assignmentName) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          assignedToEmail: assignmentEmail,
          assignedToName: assignmentName
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to assign message.");
      }
      setActionMessage(payload.message ?? "Assignment updated.");
      await loadInbox(mailboxPageToken);
      const messageResponse = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, { cache: "no-store" });
      const messagePayload = (await messageResponse.json()) as { item?: InboxMessage };
      if (messageResponse.ok) {
        setSelectedMessage(messagePayload.item ?? null);
      }
    } catch (assignError) {
      setActionMessage(assignError instanceof Error ? assignError.message : "Unable to assign message.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function updateSelectedStatus() {
    if (!selectedMessage) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-status",
          workflowStatus
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update status.");
      }
      setActionMessage(payload.message ?? "Status updated.");
      await loadInbox(mailboxPageToken);
      const messageResponse = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, { cache: "no-store" });
      const messagePayload = (await messageResponse.json()) as { item?: InboxMessage };
      if (messageResponse.ok) {
        setSelectedMessage(messagePayload.item ?? null);
      }
    } catch (statusError) {
      setActionMessage(statusError instanceof Error ? statusError.message : "Unable to update status.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function sendComposeAction() {
    if (!selectedMessage || !composeMode) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: composeMode,
          to: composeTo,
          subject: composeSubject,
          body: composeBody
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send message.");
      }
      setActionMessage(payload.message ?? "Message sent.");
      setComposeMode(null);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      await loadInbox();
    } catch (sendError) {
      setActionMessage(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function deleteSelectedMessage() {
    if (!selectedMessage) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete message.");
      }
      setActionMessage(payload.message ?? "Message moved to trash.");
      setComposeMode(null);
      await loadInbox();
    } catch (deleteError) {
      setActionMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete message.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function toggleSelectedMessageFlag() {
    if (!selectedMessage) return;
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const nextFlag = !selectedMessage.starred;
      const response = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-flag",
          flagged: nextFlag
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update flag.");
      }
      setActionMessage(payload.message ?? "Flag updated.");
      await loadInbox(mailboxPageToken);
      const messageResponse = await fetch(`/api/mailbox/${encodeURIComponent(selectedMessage.id)}`, { cache: "no-store" });
      const messagePayload = (await messageResponse.json()) as { item?: InboxMessage };
      if (messageResponse.ok) {
        setSelectedMessage(messagePayload.item ?? null);
      }
    } catch (flagError) {
      setActionMessage(flagError instanceof Error ? flagError.message : "Unable to update flag.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function saveCalendarEvent() {
    setIsSavingCalendarEvent(true);
    setCalendarMessage(null);
    try {
      const response = await fetch("/api/mailbox/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDescription,
          location: eventLocation,
          date: eventDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          sendInvites: true
        })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add event.");
      }
      setCalendarMessage(payload.message ?? "Event added.");
      setEventTitle("");
      setEventLocation("");
      setEventDescription("");
      await loadCalendar();
    } catch (saveError) {
      setCalendarMessage(saveError instanceof Error ? saveError.message : "Unable to add event.");
    } finally {
      setIsSavingCalendarEvent(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Hello Inbox</h1>
          <p>Hello@unityincommunity Inbox and Shared Calendar</p>
        </div>
      </header>

      {error ? (
        <section className="flash-panel flash-panel-warning">
          <strong>{error}</strong>
        </section>
      ) : null}

      <section className="surface-panel clean-marine-panel hello-inbox-surface">
        <div className="hello-inbox-commandbar">
          <div className="hello-inbox-commandbar-left">
            <strong>Hello Inbox</strong>
            <span className="hello-inbox-commandbar-pill">Inbox</span>
            <span className="hello-inbox-commandbar-pill">Total {items.length}</span>
            <span className="hello-inbox-commandbar-pill">Unread {unreadCount}</span>
          </div>
          <div className="hello-inbox-commandbar-right">
            <label className="field hello-inbox-search-field">
              <span>Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subject, sender, date, or message text"
              />
            </label>
            <button
              className="button-primary"
              type="button"
              onClick={() => {
                void loadInbox(mailboxPageToken);
              }}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="hello-inbox-layout">
          <aside className="hello-inbox-folder-pane">
            <h2>Folders</h2>
            <button
              type="button"
              className={`hello-inbox-folder-item${mailFolder === "inbox" ? " hello-inbox-folder-item-active" : ""}`}
              onClick={() => setMailFolder("inbox")}
            >
              Inbox
              <span>{items.length}</span>
            </button>
            <button
              type="button"
              className={`hello-inbox-folder-item${mailFolder === "flagged" ? " hello-inbox-folder-item-active" : ""}`}
              onClick={() => setMailFolder("flagged")}
            >
              Flagged
              <span>{items.filter((item) => item.starred).length}</span>
            </button>
            <button
              type="button"
              className={`hello-inbox-folder-item${mailFolder === "sent" ? " hello-inbox-folder-item-active" : ""}`}
              onClick={() => setMailFolder("sent")}
            >
              Sent
              <span>{mailFolder === "sent" ? items.length : ">"}</span>
            </button>
            <button
              type="button"
              className={`hello-inbox-folder-item${mailFolder === "junk" ? " hello-inbox-folder-item-active" : ""}`}
              onClick={() => setMailFolder("junk")}
            >
              Junk
              <span>{mailFolder === "junk" ? items.length : ">"}</span>
            </button>
            <button
              type="button"
              className={`hello-inbox-folder-item${mailFolder === "deleted" ? " hello-inbox-folder-item-active" : ""}`}
              onClick={() => setMailFolder("deleted")}
            >
              Deleted
              <span>{mailFolder === "deleted" ? items.length : ">"}</span>
            </button>
            <button type="button" className="hello-inbox-folder-item" disabled>
              Unread
              <span>{unreadCount}</span>
            </button>
            <div className="hello-inbox-contacts-panel">
              <h3>Contacts</h3>
              <label className="field">
                <span>Search Contacts</span>
                <input
                  value={contactQuery}
                  onChange={(event) => setContactQuery(event.target.value)}
                  placeholder="Search name, email, phone"
                />
              </label>
              <div className="hello-inbox-contacts-list">
                {isLoadingContacts ? (
                  <p>Loading contacts...</p>
                ) : contactsError ? (
                  <p>{contactsError}</p>
                ) : contacts.length > 0 ? (
                  contacts.slice(0, 8).map((contact) => (
                    <a key={contact.id} href={`mailto:${contact.email}`} className="hello-inbox-contact-item">
                      <strong>{contact.name}</strong>
                      <span>{contact.email}</span>
                    </a>
                  ))
                ) : (
                  <p>No contacts found.</p>
                )}
              </div>
            </div>
          </aside>

          <article className="hello-inbox-list-pane">
            <header className="hello-inbox-pane-titlebar">
              <div className="hello-inbox-list-header-tabs">
                <button
                  type="button"
                  className={`hello-inbox-list-tab${mailViewMode === "focused" ? " hello-inbox-list-tab-active" : ""}`}
                  onClick={() => setMailViewMode("focused")}
                >
                  Focused
                </button>
                <button
                  type="button"
                  className={`hello-inbox-list-tab${mailViewMode === "all" ? " hello-inbox-list-tab-active" : ""}`}
                  onClick={() => {
                    setMailViewMode("all");
                    if (mailFolder === "inbox") {
                      void loadInbox(null, true, "inbox");
                    }
                  }}
                >
                  All
                </button>
              </div>
              <span>{visibleItems.length} messages</span>
            </header>
            <div className="hello-inbox-view-badge-row">
              {mailFolder === "inbox" ? (
                <span className="hello-inbox-view-badge">Showing: Today + Last 20 baseline</span>
              ) : (
                <span className="hello-inbox-view-badge">Showing: {mailFolder.charAt(0).toUpperCase() + mailFolder.slice(1)} folder</span>
              )}
            </div>

            <div className="hello-inbox-list">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => {
                  const actionMeta = getActionMeta(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`hello-inbox-list-item${selectedId === item.id ? " hello-inbox-list-item-active" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="hello-inbox-item-topline">
                        <strong className="hello-inbox-item-from">{item.from}</strong>
                        <span className="hello-inbox-item-date">{item.date || "No date"}</span>
                      </div>
                      <p className="hello-inbox-item-subject">{item.subject || "(No subject)"}</p>
                      <p className="hello-inbox-item-snippet">{item.snippet || "(No preview text)"}</p>
                      <div className="hello-inbox-item-tags">
                        {item.unread ? <span className="hello-inbox-unread-indicator">Unread</span> : null}
                        {item.starred ? (
                          <span className="hello-inbox-action-indicator hello-inbox-action-indicator-info">Flagged</span>
                        ) : null}
                        {item.assignedToName ? (
                          <span className="hello-inbox-action-indicator hello-inbox-action-indicator-info">
                            Assigned: {item.assignedToName}
                          </span>
                        ) : null}
                        <span
                          className={`hello-inbox-action-indicator hello-inbox-action-indicator-${getWorkflowMeta(item.workflowStatus).tone}`}
                        >
                          {getWorkflowMeta(item.workflowStatus).label}
                        </span>
                        {actionMeta ? (
                          <span className={`hello-inbox-action-indicator hello-inbox-action-indicator-${actionMeta.tone}`}>
                            {actionMeta.label}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <article className="dashboard-today-card">
                  <strong>No messages found for this {mailViewMode} view.</strong>
                </article>
              )}
            </div>
            <div className="hello-inbox-pager">
              <button
                type="button"
                className="button-secondary"
                onClick={openPreviousInboxPage}
                disabled={isLoading || mailboxTokenHistory.length === 0}
              >
                Previous 20
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={openNextInboxPage}
                disabled={isLoading || !nextMailboxPageToken}
              >
                Next 20
              </button>
            </div>
          </article>

          <article className="hello-inbox-reading-pane">
            <header className="hello-inbox-pane-titlebar">
              <h2>{selectedMessage?.subject || "Reading pane"}</h2>
              <span>{selectedListItem?.date || selectedMessage?.date || "No date"}</span>
            </header>

            <div className="hello-inbox-reading-stack">
              {isLoadingMessage ? (
                <article className="dashboard-today-card">
                  <strong>Loading message...</strong>
                </article>
              ) : selectedMessage ? (
                <>
                  <div className="hello-inbox-reading-head">
                    <div className="hello-inbox-message-actions">
                      <button className="button-secondary" type="button" onClick={() => openCompose("reply")} disabled={isActionLoading}>
                        Reply
                      </button>
                      <button className="button-secondary" type="button" onClick={() => openCompose("forward")} disabled={isActionLoading}>
                        Forward
                      </button>
                      <button className="button-secondary" type="button" onClick={toggleSelectedMessageFlag} disabled={isActionLoading}>
                        {selectedMessage.starred ? "Unflag" : "Flag"}
                      </button>
                      <button className="button-secondary" type="button" onClick={deleteSelectedMessage} disabled={isActionLoading}>
                        Delete
                      </button>
                    </div>
                    <div className="hello-inbox-assignment-row">
                      <label className="field">
                        <span>Assign/Reassign</span>
                        <select
                          value={assignmentEmail}
                          onChange={(event) => {
                            const selected = adminOptions.find((item) => item.email === event.target.value);
                            setAssignmentEmail(event.target.value);
                            setAssignmentName(selected?.name ?? "");
                          }}
                        >
                          <option value="">Select admin</option>
                          {adminOptions.map((admin) => (
                            <option key={admin.email} value={admin.email}>
                              {admin.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={assignSelectedMessage}
                        disabled={isActionLoading || !assignmentEmail}
                      >
                        {selectedMessage.assignedToEmail ? "Reassign" : "Assign"}
                      </button>
                    </div>
                    <div className="hello-inbox-assignment-row">
                      <label className="field">
                        <span>Status</span>
                        <select
                          value={workflowStatus}
                          onChange={(event) =>
                            setWorkflowStatus(
                              event.target.value as
                                | "open"
                                | "actioned"
                                | "ignored"
                                | "to-be-deleted"
                                | "needs-response"
                                | "waiting-external"
                                | "assigned-to-councillor"
                            )
                          }
                        >
                          <option value="open">Open</option>
                          <option value="actioned">Actioned</option>
                          <option value="ignored">Ignored</option>
                          <option value="to-be-deleted">To Be Deleted</option>
                          <option value="needs-response">Needs Response (Recommended)</option>
                          <option value="waiting-external">Waiting External (Recommended)</option>
                          <option value="assigned-to-councillor">Assigned to Councillor</option>
                        </select>
                      </label>
                      <button className="button-secondary" type="button" onClick={updateSelectedStatus} disabled={isActionLoading}>
                        Save Status
                      </button>
                    </div>
                    <p>
                      <strong>From:</strong> {selectedMessage.from}
                    </p>
                    <p>
                      <strong>To:</strong> {selectedMessage.to || "-"}
                    </p>
                    <p>
                      <strong>Subject:</strong> {selectedMessage.subject || "-"}
                    </p>
                  </div>

                  {composeMode ? (
                    <section className="hello-inbox-compose">
                      <h3>{composeMode === "reply" ? "Reply" : "Forward"}</h3>
                      <div className="form-grid">
                        <label className="field">
                          <span>To</span>
                          <input value={composeTo} onChange={(event) => setComposeTo(event.target.value)} />
                        </label>
                        <label className="field field-full">
                          <span>Subject</span>
                          <input value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} />
                        </label>
                        <label className="field field-full">
                          <span>Message</span>
                          <textarea rows={5} value={composeBody} onChange={(event) => setComposeBody(event.target.value)} />
                        </label>
                      </div>
                      <div className="dashboard-actions-row">
                        <button className="button-primary" type="button" onClick={sendComposeAction} disabled={isActionLoading}>
                          {isActionLoading ? "Sending..." : composeMode === "reply" ? "Send Reply" : "Send Forward"}
                        </button>
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() => setComposeMode(null)}
                          disabled={isActionLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {actionMessage ? <p className="hello-inbox-inline-message">{actionMessage}</p> : null}

                  <article className="hello-inbox-reading-body-card">
                    <p>{selectedMessage.textBody || selectedMessage.snippet || "(No readable text body)"}</p>
                  </article>
                </>
              ) : (
                <article className="dashboard-today-card">
                  <strong>Select a message to preview.</strong>
                </article>
              )}

              <section className="hello-inbox-calendar-panel">
                <header className="hello-inbox-pane-titlebar">
                  <h2>Shared Calendar</h2>
                  <span>{calendarItems.length} events</span>
                </header>
                <div className="hello-inbox-calendar-controls">
                  <div className="status-strip">
                    <button type="button" className={`status-chip ${calendarView === "month" ? "status-chip-open" : "status-chip-default"}`} onClick={() => setCalendarView("month")}>
                      Month
                    </button>
                    <button type="button" className={`status-chip ${calendarView === "week" ? "status-chip-open" : "status-chip-default"}`} onClick={() => setCalendarView("week")}>
                      Week
                    </button>
                    <button type="button" className={`status-chip ${calendarView === "day" ? "status-chip-open" : "status-chip-default"}`} onClick={() => setCalendarView("day")}>
                      Day
                    </button>
                  </div>
                  <label className="field">
                    <span>Anchor Date</span>
                    <input type="date" value={calendarAnchorDate} onChange={(event) => setCalendarAnchorDate(event.target.value)} />
                  </label>
                </div>

                <div className="hello-inbox-calendar-list">
                  {isCalendarLoading ? (
                    <article className="dashboard-today-card">
                      <strong>Loading calendar...</strong>
                    </article>
                  ) : calendarItems.length > 0 ? (
                    calendarItems.map((item) => (
                      <article key={item.id} className="dashboard-today-card">
                        <strong>{item.title}</strong>
                        <p>{item.isAllDay ? "All day" : `${formatDateTime(item.start)} - ${formatDateTime(item.end)}`}</p>
                        {item.location ? <p>{item.location}</p> : null}
                      </article>
                    ))
                  ) : (
                    <article className="dashboard-today-card">
                      <strong>No events in this view.</strong>
                    </article>
                  )}
                </div>

                <section className="hello-inbox-calendar-create">
                  <h3>Add Event</h3>
                  <div className="form-grid">
                    <label className="field">
                      <span>Title</span>
                      <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Start Time</span>
                      <input type="time" value={eventStartTime} onChange={(event) => setEventStartTime(event.target.value)} />
                    </label>
                    <label className="field">
                      <span>End Time</span>
                      <input type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} />
                    </label>
                    <label className="field field-full">
                      <span>Location</span>
                      <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} />
                    </label>
                    <label className="field field-full">
                      <span>Description</span>
                      <textarea rows={3} value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} />
                    </label>
                  </div>
                  <div className="dashboard-actions-row">
                    <button className="button-primary" type="button" onClick={saveCalendarEvent} disabled={isSavingCalendarEvent}>
                      {isSavingCalendarEvent ? "Saving..." : "Add Event"}
                    </button>
                  </div>
                  {calendarMessage ? <p className="hello-inbox-inline-message">{calendarMessage}</p> : null}
                </section>
              </section>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
