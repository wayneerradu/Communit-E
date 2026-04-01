"use client";

import Link from "next/link";
import { GlobalSearch } from "@/components/shared/global-search";
import type { Fault, GlobalSearchItem } from "@/types/domain";

function getStatusTone(status: Fault["status"]) {
  switch (status) {
    case "closed":
      return "success";
    case "in-progress":
      return "default";
    case "escalated":
      return "warning";
    case "archived":
      return "default";
    default:
      return "default";
  }
}

type FaultsSubpageConsoleProps = {
  title: string;
  description: string;
  faults: Fault[];
  badgeLabel: string;
  emptyTitle: string;
  emptyDetail: string;
  searchPlaceholder?: string;
  children?: React.ReactNode;
};

export function FaultsSubpageConsole({
  title,
  description,
  faults,
  badgeLabel,
  emptyTitle,
  emptyDetail,
  searchPlaceholder,
  children
}: FaultsSubpageConsoleProps) {
  const searchItems: GlobalSearchItem[] = faults.map((fault) => ({
    id: fault.id,
    title: `${fault.id} • ${fault.title}`,
    subtitle: [fault.locationText, fault.category, fault.priority].filter(Boolean).join(" • "),
    kind: "fault",
    keywords: [fault.description, fault.reporterEmail, fault.municipalityEmail].filter(Boolean) as string[]
  }));

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} placeholder={searchPlaceholder ?? "Search faults, roads, categories, reporters..."} />
          <Link className="button-secondary" href="/dashboard/faults">
            Faults Overview
          </Link>
          <Link className="button-primary" href="/dashboard/faults/log">
            Escalate Fault
          </Link>
        </div>
      </header>

      {children}

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <span className="status-chip status-chip-default">{badgeLabel}</span>
          </div>

          {faults.length ? (
            <div className="dashboard-stack">
              {faults.map((fault) => (
                <article key={fault.id} className="dashboard-approval-card">
                  <div className="panel-head">
                    <div>
                      <h3>{fault.title}</h3>
                      <p>{fault.description}</p>
                    </div>
                    <span className={`status-chip status-chip-${getStatusTone(fault.status)}`}>{fault.status}</span>
                  </div>
                  <div className="meta-row">
                    <span className="tag">Ref# {fault.id}</span>
                    <span className="tag">{fault.category}</span>
                    <span className="tag">Priority: {fault.priority}</span>
                    <span className="tag">{fault.locationText}</span>
                    {fault.assignedAdminName ? <span className="tag">Assigned: {fault.assignedAdminName}</span> : null}
                    {fault.externalEscalated ? <span className="tag">Escalated externally</span> : null}
                  </div>
                  <div className="dashboard-actions-row">
                    <Link href={`/dashboard/faults/register?focusFault=${encodeURIComponent(fault.id)}`} className="button-secondary">
                      Open and Work Fault
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="dashboard-today-card">
              <strong>{emptyTitle}</strong>
              <p>{emptyDetail}</p>
            </article>
          )}
        </article>
      </section>
    </>
  );
}
