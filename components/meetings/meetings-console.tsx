"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, MeetingMinute } from "@/types/domain";

type MeetingsConsoleProps = {
  initialMinutes: MeetingMinute[];
  focusMinuteId?: string;
  contextMessage?: string;
  focusAction?: string;
};

const defaultForm = {
  title: "",
  meetingAt: "",
  attendees: "",
  notes: ""
};

export function MeetingsConsole({ initialMinutes, focusMinuteId, contextMessage, focusAction }: MeetingsConsoleProps) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [highlightedMinuteId, setHighlightedMinuteId] = useState(focusMinuteId ?? initialMinutes[0]?.id ?? "");
  const jumpTargetId = highlightedMinuteId ? `meeting-focus-${highlightedMinuteId}` : "";
  const searchItems: GlobalSearchItem[] = minutes.map((minute) => ({
    id: minute.id,
    title: minute.title,
    subtitle: [new Date(minute.meetingAt).toLocaleString("en-ZA"), minute.attendees.join(", ")].filter(Boolean).join(" • "),
    kind: "meeting",
    keywords: [minute.notes, ...minute.attendees].filter(Boolean)
  }));

  useEffect(() => {
    if (focusMinuteId) {
      setHighlightedMinuteId(focusMinuteId);
    }
  }, [focusMinuteId]);

  useEffect(() => {
    if (!contextMessage || !jumpTargetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contextMessage, jumpTargetId]);

  async function createMeeting() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create meeting minute.");
      }

      setMinutes((current) => [payload.item, ...current]);
      setForm(defaultForm);
      setMessage("Meeting minute created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create meeting minute.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Meetings</h1>
          <p>Capture meetings quickly, keep minutes structured, and make governance visible instead of losing it in chat.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              setHighlightedMinuteId(item.id);
              window.setTimeout(() => {
                document.getElementById(`meeting-focus-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 80);
            }}
          />
          <Link className="button-secondary" href="/dashboard/meetings/scheduler">
            Meeting Scheduler
          </Link>
          <button className="button-primary" type="button" onClick={createMeeting} disabled={isBusy}>
            {isBusy ? "Working..." : "Create Minute"}
          </button>
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

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Minute Intake</h2>
              <p>Capture a meeting with the basic structure now, then we can layer transcription and sign-off on top.</p>
            </div>
            <span className="status-chip status-chip-success">Live Intake</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Meeting Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Date / Time</span>
              <input type="datetime-local" value={form.meetingAt} onChange={(event) => setForm((current) => ({ ...current, meetingAt: event.target.value }))} />
            </label>
            <label className="field field-full">
              <span>Attendees</span>
              <input value={form.attendees} onChange={(event) => setForm((current) => ({ ...current, attendees: event.target.value }))} placeholder="Comma separated attendees" />
            </label>
            <label className="field field-full">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={6} />
            </label>
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Meeting Register</h2>
              <p>Minutes remain searchable and visible so the whole team can follow what was agreed.</p>
            </div>
            <span className="status-chip status-chip-default">{minutes.length} minutes</span>
          </div>

          <div className="dashboard-stack">
            {minutes.map((minute) => (
              <article key={minute.id} id={`meeting-focus-${minute.id}`} className={`dashboard-minute-card${highlightedMinuteId === minute.id ? " dashboard-context-highlight" : ""}`}>
                <div className="panel-head">
                  <strong>{minute.title}</strong>
                  <span className="status-chip status-chip-default">{new Date(minute.meetingAt).toLocaleString("en-ZA")}</span>
                </div>
                <p>{minute.notes}</p>
                <div className="meta-row">
                  {minute.attendees.map((attendee) => (
                    <span key={attendee} className="tag">{attendee}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
