"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, Resolution } from "@/types/domain";

type ResolutionsConsoleProps = {
  initialResolutions: Resolution[];
  focusResolutionId?: string;
  focusAction?: string;
  contextMessage?: string;
};

const defaultForm = {
  title: "",
  description: "",
  type: "yes-no" as Resolution["type"],
  deadlineAt: "",
  optionsText: "Yes\nNo"
};

export function ResolutionsConsole({
  initialResolutions,
  focusResolutionId,
  focusAction,
  contextMessage
}: ResolutionsConsoleProps) {
  const [resolutions, setResolutions] = useState(initialResolutions);
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [highlightedResolutionId, setHighlightedResolutionId] = useState(focusResolutionId ?? initialResolutions[0]?.id ?? "");
  const jumpTargetId = highlightedResolutionId ? `resolution-focus-${highlightedResolutionId}` : "";
  const searchItems: GlobalSearchItem[] = resolutions.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: [item.status, new Date(item.deadlineAt).toLocaleString("en-ZA")].join(" • "),
    kind: "resolution",
    keywords: [item.description, ...item.options, ...item.votes.map((vote) => `${vote.voter} ${vote.choice}`)].filter(Boolean)
  }));

  const openCount = useMemo(() => resolutions.filter((item) => item.status === "open").length, [resolutions]);

  useEffect(() => {
    if (focusResolutionId) {
      setHighlightedResolutionId(focusResolutionId);
    }
  }, [focusResolutionId]);

  useEffect(() => {
    if (!contextMessage || !jumpTargetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contextMessage, jumpTargetId]);

  async function createResolutionAction() {
    setIsBusy(true);
    setMessage(null);

    try {
      const options = form.optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      const response = await fetch("/api/resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          deadlineAt: form.deadlineAt,
          options
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create resolution.");
      }

      setResolutions((current) => [payload.item, ...current]);
      setForm(defaultForm);
      setMessage("Resolution opened for voting.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create resolution.");
    } finally {
      setIsBusy(false);
    }
  }

  async function vote(id: string, choice: string) {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/resolutions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to record vote.");
      }

      setResolutions((current) => current.map((item) => (item.id === payload.id ? payload : item)));
      setMessage(`Vote recorded for ${choice}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record vote.");
    } finally {
      setIsBusy(false);
    }
  }

  function jumpToSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function handleStatTileClick(target: "open" | "passed" | "total") {
    if (target === "open" && resolutions.find((item) => item.status === "open")) {
      setHighlightedResolutionId(resolutions.find((item) => item.status === "open")?.id ?? "");
      jumpToSection("resolutions-list");
      return;
    }

    if (target === "passed" && resolutions.find((item) => item.status === "passed")) {
      setHighlightedResolutionId(resolutions.find((item) => item.status === "passed")?.id ?? "");
      jumpToSection("resolutions-list");
      return;
    }

    if (resolutions[0]) {
      setHighlightedResolutionId(resolutions[0].id);
    }
    jumpToSection("resolutions-list");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Resolutions</h1>
          <p>Run internal votes, keep visible history, and stop important decisions getting lost in WhatsApp.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              setHighlightedResolutionId(item.id);
              window.setTimeout(() => {
                document.getElementById(`resolution-focus-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 80);
            }}
          />
          <button className="button-primary" type="button" onClick={createResolutionAction} disabled={isBusy}>
            {isBusy ? "Working..." : "Open Resolution"}
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
            <strong>Opened from My Work</strong>
            <button className="button-secondary" type="button" onClick={() => document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Jump to item
            </button>
          </div>
          <p>{contextMessage}</p>
          {focusAction ? <span className="tag">Next action: {focusAction}</span> : null}
        </section>
      ) : null}

      <section className="dashboard-stat-grid">
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("open")}>
          <span>Open</span>
          <strong>{openCount}</strong>
          <small>Active votes in play</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("passed")}>
          <span>Passed</span>
          <strong>{resolutions.filter((item) => item.status === "passed").length}</strong>
          <small>Reached quorum</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("total")}>
          <span>Total</span>
          <strong>{resolutions.length}</strong>
          <small>Visible decision history</small>
        </button>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Resolution Intake</h2>
              <p>Create yes/no or multi-option internal votes with an explicit deadline and visible vote history.</p>
            </div>
            <span className="status-chip status-chip-success">Live Voting</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Type</span>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as Resolution["type"], optionsText: event.target.value === "yes-no" ? "Yes\nNo" : current.optionsText }))}>
                <option value="yes-no">Yes / No</option>
                <option value="multi-option">Multi Option</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>Deadline</span>
              <input type="datetime-local" value={form.deadlineAt} onChange={(event) => setForm((current) => ({ ...current, deadlineAt: event.target.value }))} />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} />
            </label>
            <label className="field field-full">
              <span>Options</span>
              <textarea value={form.optionsText} onChange={(event) => setForm((current) => ({ ...current, optionsText: event.target.value }))} rows={4} />
            </label>
          </div>
        </article>

        <article id="resolutions-list" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Open And Historical Votes</h2>
              <p>Every vote stays visible with who voted and what the current outcome is.</p>
            </div>
            <span className="status-chip status-chip-default">{resolutions.length} votes</span>
          </div>

          <div className="dashboard-stack">
            {resolutions.map((resolution) => (
              <article key={resolution.id} id={`resolution-focus-${resolution.id}`} className={`dashboard-approval-card${highlightedResolutionId === resolution.id ? " dashboard-context-highlight" : ""}`}>
                <div className="panel-head">
                  <div>
                    <h3>{resolution.title}</h3>
                    <p>{resolution.description}</p>
                  </div>
                  <span className={`status-chip status-chip-${resolution.status === "passed" ? "success" : resolution.status === "open" ? "warning" : "default"}`}>
                    {resolution.status}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="tag">Deadline: {new Date(resolution.deadlineAt).toLocaleString("en-ZA")}</span>
                  <span className="tag">Votes: {resolution.votes.length}</span>
                  <span className="tag">Quorum: {resolution.quorumTarget}</span>
                </div>
                <div className="dashboard-actions-row">
                  {resolution.options.map((option) => (
                    <button key={option} className={`button-secondary${highlightedResolutionId === resolution.id && focusAction === "vote" ? " dashboard-action-highlight-secondary" : ""}`} type="button" onClick={() => vote(resolution.id, option)} disabled={isBusy || resolution.status !== "open"}>
                      Vote {option}
                    </button>
                  ))}
                </div>
                <div className="meta-row">
                  {resolution.votes.map((voteEntry) => (
                    <span key={`${resolution.id}-${voteEntry.voter}`} className="tag">
                      {voteEntry.voter}: {voteEntry.choice}
                    </span>
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
