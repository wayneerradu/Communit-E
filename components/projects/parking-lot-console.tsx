"use client";

import { useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, ParkingLotIdea } from "@/types/domain";

type ParkingLotConsoleProps = {
  initialIdeas: ParkingLotIdea[];
};

const defaultForm = {
  title: "",
  justification: "",
  priority: "medium" as ParkingLotIdea["priority"],
  threshold: "10"
};

export function ParkingLotConsole({ initialIdeas }: ParkingLotConsoleProps) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [form, setForm] = useState(defaultForm);
  const [highlightedIdeaId, setHighlightedIdeaId] = useState(initialIdeas[0]?.id ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const searchItems: GlobalSearchItem[] = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    subtitle: [idea.priority, idea.status, `${idea.votes.length} votes`].join(" • "),
    kind: "project",
    keywords: [idea.justification]
  }));

  async function createIdea() {
    const title = form.title.trim();
    const justification = form.justification.trim();
    const threshold = Number(form.threshold);

    if (!title || !justification || !Number.isFinite(threshold) || threshold <= 0) {
      setMessage("Please complete title, justification, and a valid vote threshold.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/parking-lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          justification,
          priority: form.priority,
          threshold
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to add parking lot idea.");
      }

      const nextIdea = payload.item as ParkingLotIdea;
      setIdeas((current) => [nextIdea, ...current]);
      setHighlightedIdeaId(nextIdea.id);
      setForm(defaultForm);
      setMessage("Idea added to Parking Lot.");
      window.setTimeout(() => {
        document.getElementById(`parking-lot-focus-${nextIdea.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add parking lot idea.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Parking Lot</h1>
          <p>Keep ideas, purchases, and future improvements visible until they are promoted into action.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              setHighlightedIdeaId(item.id);
              window.setTimeout(() => {
                document.getElementById(`parking-lot-focus-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 80);
            }}
          />
          <button className="button-primary" type="button" onClick={() => void createIdea()} disabled={isBusy}>
            {isBusy ? "Saving..." : "Add Idea"}
          </button>
        </div>
      </header>

      {message ? (
        <section className="flash-panel flash-panel-default">
          <strong>{message}</strong>
        </section>
      ) : null}

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Idea Intake</h2>
              <p>Add ideas here so they stay visible and can be weighed up properly later.</p>
            </div>
            <span className="status-chip status-chip-success">Live Intake</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Idea Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as ParkingLotIdea["priority"] }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Vote Threshold</span>
              <input value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} />
            </label>
            <label className="field field-full">
              <span>Justification</span>
              <textarea
                rows={5}
                value={form.justification}
                onChange={(event) => setForm((current) => ({ ...current, justification: event.target.value }))}
              />
            </label>
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Idea Register</h2>
              <p>Ideas stay ranked and visible here instead of disappearing into chat.</p>
            </div>
            <span className="status-chip status-chip-default">{ideas.length} items</span>
          </div>

          <div className="dashboard-stack">
            {ideas.map((idea) => (
              <article
                key={idea.id}
                id={`parking-lot-focus-${idea.id}`}
                className={`dashboard-approval-card${highlightedIdeaId === idea.id ? " dashboard-context-highlight" : ""}`}
              >
                <div className="panel-head">
                  <div>
                    <h3>{idea.title}</h3>
                    <p>{idea.justification}</p>
                  </div>
                  <span className={`status-chip status-chip-${idea.priority === "high" ? "warning" : "default"}`}>{idea.status}</span>
                </div>
                <div className="meta-row">
                  <span className="tag">Priority: {idea.priority}</span>
                  <span className="tag">Votes: {idea.votes.length}</span>
                  <span className="tag">Threshold: {idea.threshold}</span>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
