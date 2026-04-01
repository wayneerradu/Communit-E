"use client";

import { useEffect, useMemo, useState } from "react";

type AttendeeOption = {
  email: string;
  name: string;
};

type MeetingSchedulerConsoleProps = {
  attendeeOptions: AttendeeOption[];
  connectedCalendarAccount: string;
  calendarName: string;
  calendarEnabled: boolean;
};

const defaultForm = {
  title: "",
  meetingType: "operations",
  agenda: "",
  location: "",
  meetingDate: "",
  startTime: "",
  endTime: "",
  requiredAttendees: [] as string[],
  optionalAttendees: [] as string[],
  sendInvites: true
};

const meetingTypeOptions = [
  { value: "operations", label: "Operations" },
  { value: "residents", label: "Residents" },
  { value: "emergency", label: "Emergency" },
  { value: "project", label: "Project" },
  { value: "committee", label: "Committee" },
  { value: "other", label: "Other" }
] as const;

export function MeetingSchedulerConsole({
  attendeeOptions,
  connectedCalendarAccount,
  calendarName,
  calendarEnabled
}: MeetingSchedulerConsoleProps) {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "warning" | "danger">("success");
  const [isBusy, setIsBusy] = useState(false);
  const [isScheduleHighlighted, setIsScheduleHighlighted] = useState(true);

  const sortedAttendees = useMemo(
    () => [...attendeeOptions].sort((left, right) => left.name.localeCompare(right.name)),
    [attendeeOptions]
  );

  const hasRequiredFormValues = Boolean(
    form.title.trim() &&
      form.agenda.trim() &&
      form.location.trim() &&
      form.meetingDate &&
      form.startTime &&
      form.endTime &&
      form.requiredAttendees.length > 0
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsScheduleHighlighted(false);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleAttendee(email: string, target: "requiredAttendees" | "optionalAttendees") {
    setForm((current) => {
      const currentValues = current[target];
      const otherTarget = target === "requiredAttendees" ? "optionalAttendees" : "requiredAttendees";
      const nextValues = currentValues.includes(email)
        ? currentValues.filter((item) => item !== email)
        : [...currentValues, email];

      return {
        ...current,
        [target]: nextValues,
        [otherTarget]: current[otherTarget].filter((item) => item !== email)
      };
    });
  }

  async function scheduleMeeting() {
    if (!hasRequiredFormValues) {
      setMessageTone("warning");
      setMessage("Complete all meeting details and add at least one required attendee before scheduling.");
      return;
    }

    if (!calendarEnabled) {
      setMessageTone("danger");
      setMessage("Calendar connection is currently disabled. Enable it in Settings before scheduling meetings.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to schedule the meeting.");
      }

      setForm(defaultForm);
      setMessageTone("success");
      setMessage(payload.message ?? "Meeting scheduled and written to the shared calendar.");
    } catch (error) {
      setMessageTone("danger");
      setMessage(error instanceof Error ? error.message : "Unable to schedule the meeting.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Meeting Scheduler</h1>
          <p>Schedule meetings, send invites, and publish them to the shared calendar.</p>
        </div>
      </header>

      {message ? (
        <section className={`flash-panel flash-panel-${messageTone}`}>
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Meeting Details</h2>
              <p>Capture the core information once, then let the platform publish it to the shared calendar.</p>
            </div>
            <div className="dashboard-actions-row">
              <span className={`status-chip status-chip-${calendarEnabled ? "success" : "warning"}`}>
                {calendarEnabled ? "Calendar Ready" : "Calendar Disabled"}
              </span>
              <button
                className={`button-primary${isScheduleHighlighted ? " dashboard-action-highlight" : ""}`}
                type="button"
                onClick={scheduleMeeting}
                disabled={isBusy}
              >
                {isBusy ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Meeting Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Meeting Type</span>
              <select
                value={form.meetingType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meetingType: event.target.value as (typeof defaultForm)["meetingType"]
                  }))
                }
              >
                {meetingTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Location</span>
              <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" value={form.meetingDate} onChange={(event) => setForm((current) => ({ ...current, meetingDate: event.target.value }))} />
            </label>
            <label className="field">
              <span>Start Time</span>
              <input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
            </label>
            <label className="field">
              <span>End Time</span>
              <input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
            </label>
            <label className="field field-full">
              <span>Agenda / Notes</span>
              <textarea rows={6} value={form.agenda} onChange={(event) => setForm((current) => ({ ...current, agenda: event.target.value }))} />
            </label>
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Calendar And Delivery</h2>
              <p>Invites will come from the connected shared-calendar account once the event is created.</p>
            </div>
            <span className="status-chip status-chip-default">{calendarName}</span>
          </div>

          <div className="config-grid">
            <div className="config-item">
              <label>Calendar</label>
              <strong>{calendarName}</strong>
            </div>
            <div className="config-item">
              <label>Connected Account</label>
              <strong>{connectedCalendarAccount || "Not connected yet"}</strong>
            </div>
            <div className="config-item">
              <label>Invite Delivery</label>
              <strong>{form.sendInvites ? "Send invites" : "Create without invites"}</strong>
            </div>
            <div className="config-item">
              <label>Required Attendees</label>
              <strong>{form.requiredAttendees.length}</strong>
            </div>
          </div>

          <label className="toggle-field field-wide">
            <input
              type="checkbox"
              checked={form.sendInvites}
              onChange={(event) => setForm((current) => ({ ...current, sendInvites: event.target.checked }))}
            />
            <span>Send Google Calendar invites from the connected account</span>
          </label>
        </article>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Required Attendees</h2>
              <p>Select the people who must receive the calendar invite.</p>
            </div>
            <span className="status-chip status-chip-warning">{form.requiredAttendees.length}</span>
          </div>
          <div className="dashboard-stack">
            {sortedAttendees.map((attendee) => (
              <article key={attendee.email} className="dashboard-today-card">
                <div className="panel-head">
                  <div>
                    <strong>{attendee.name}</strong>
                    <p>{attendee.email}</p>
                  </div>
                  <button
                    className={`button-secondary${form.requiredAttendees.includes(attendee.email) ? " status-choice-button-active" : ""}`}
                    type="button"
                    onClick={() => toggleAttendee(attendee.email, "requiredAttendees")}
                  >
                    {form.requiredAttendees.includes(attendee.email) ? "Added" : "Add Required"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Optional Attendees</h2>
              <p>Add optional invitees who may want visibility but are not mandatory attendees.</p>
            </div>
            <span className="status-chip status-chip-default">{form.optionalAttendees.length}</span>
          </div>
          <div className="dashboard-stack">
            {sortedAttendees.map((attendee) => (
              <article key={`${attendee.email}-optional`} className="dashboard-today-card">
                <div className="panel-head">
                  <div>
                    <strong>{attendee.name}</strong>
                    <p>{attendee.email}</p>
                  </div>
                  <button
                    className={`button-secondary${form.optionalAttendees.includes(attendee.email) ? " status-choice-button-active" : ""}`}
                    type="button"
                    onClick={() => toggleAttendee(attendee.email, "optionalAttendees")}
                  >
                    {form.optionalAttendees.includes(attendee.email) ? "Added" : "Add Optional"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
