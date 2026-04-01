import Link from "next/link";
import { FaultsSubpageConsole } from "@/components/faults/faults-subpage-console";
import { getFaultsData } from "@/lib/hub-data";
export const dynamic = "force-dynamic";

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysSince(value?: string) {
  const parsed = parseDate(value);
  if (!parsed) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
}

type EscalationStage = "all" | "set-to-escalate" | "plus" | "plusplus";

function normalizeStage(value?: string): EscalationStage {
  if (value === "set-to-escalate" || value === "plus" || value === "plusplus") {
    return value;
  }
  return "all";
}

export default function FaultEscalationsPage({
  searchParams
}: {
  searchParams?: Promise<{ stage?: string }>;
}) {
  const resolvedSearchParams: Promise<{ stage?: string }> = searchParams ?? Promise.resolve({ stage: undefined });
  const stagePromise = resolvedSearchParams.then((params) => normalizeStage(params?.stage));
  return stagePromise.then((activeStage) => renderEscalationsPage(activeStage));
}

function renderEscalationsPage(activeStage: EscalationStage) {
  const { faults } = getFaultsData();
  const escalatedFaults = faults.filter(
    (fault) =>
      fault.status === "escalated" ||
      fault.status === "in-progress" ||
      fault.escalationLevel === "plus" ||
      fault.escalationLevel === "plusplus" ||
      fault.internalEscalated ||
      fault.externalEscalated
  );
  const openEscalations = escalatedFaults.filter((fault) => fault.status !== "closed" && fault.status !== "archived");
  const escalatePlusPlusFaults = openEscalations.filter(
    (fault) => fault.escalationLevel === "plusplus" || fault.externalEscalated
  );
  const escalatePlusFaults = openEscalations.filter(
    (fault) =>
      fault.escalationLevel === "plus" ||
      (fault.internalEscalated && !fault.externalEscalated && fault.escalationLevel !== "plusplus")
  );
  const setToEscalateFaults = openEscalations.filter(
    (fault) => !escalatePlusFaults.some((item) => item.id === fault.id) && !escalatePlusPlusFaults.some((item) => item.id === fault.id)
  );
  const overdueNoProgress = openEscalations.filter((fault) => !fault.firstInProgressAt && daysSince(fault.escalatedAt ?? fault.createdAt) >= 2);
  const staleUpdates = openEscalations.filter((fault) => daysSince(fault.updatedAt) >= 2);
  const criticalPressure = openEscalations.filter((fault) => fault.priority === "critical");
  const plusPlusCandidates = openEscalations.filter((fault) => {
    const age = daysSince(fault.escalatedAt ?? fault.createdAt);
    return fault.priority === "critical" || fault.priority === "high" ? age >= 2 : age >= 7;
  });
  const stageFilteredFaults =
    activeStage === "set-to-escalate"
      ? setToEscalateFaults
      : activeStage === "plus"
        ? escalatePlusFaults
        : activeStage === "plusplus"
          ? escalatePlusPlusFaults
          : escalatedFaults;

  const nudgeItems = [
    `${overdueNoProgress.length} open escalations have no in-progress movement yet.`,
    `${staleUpdates.length} escalations have had no update in 2+ days.`,
    `${criticalPressure.length} critical escalations need active pressure follow-up.`,
    `${plusPlusCandidates.length} escalations are likely due for Escalate++ review.`
  ];

  return (
    <FaultsSubpageConsole
      title="Escalations"
      description="Faults already pushed into pressure mode so references, follow-ups, and municipality accountability stay visible."
      faults={stageFilteredFaults}
      badgeLabel={
        activeStage === "all"
          ? `${stageFilteredFaults.length} escalations`
          : `${stageFilteredFaults.length} ${activeStage === "set-to-escalate" ? "set to escalate" : activeStage === "plus" ? "escalate+" : "escalate++"}`
      }
      emptyTitle="No escalated faults yet."
      emptyDetail="Once faults are escalated internally or externally, they will live here for active follow-up."
      searchPlaceholder="Search escalated faults, departments, or roads..."
    >
      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Escalation Focus</h2>
              <p>Active escalations split by escalation stage for immediate triage.</p>
            </div>
            <span className="status-chip status-chip-warning">{openEscalations.length} open</span>
          </div>
          <div className="dashboard-stat-grid">
            <Link
              href="/dashboard/faults/escalations?stage=set-to-escalate"
              className={`dashboard-stat-card dashboard-stat-card-warning dashboard-card-link ${activeStage === "set-to-escalate" ? "dashboard-card-link-selected" : ""}`}
            >
              <span>Set to Escalate</span>
              <strong>{setToEscalateFaults.length}</strong>
              <small>Awaiting escalation pressure actions</small>
            </Link>
            <Link
              href="/dashboard/faults/escalations?stage=plus"
              className={`dashboard-stat-card dashboard-stat-card-default dashboard-card-link ${activeStage === "plus" ? "dashboard-card-link-selected" : ""}`}
            >
              <span>Escalate+</span>
              <strong>{escalatePlusFaults.length}</strong>
              <small>Supervisor pressure stage</small>
            </Link>
            <Link
              href="/dashboard/faults/escalations?stage=plusplus"
              className={`dashboard-stat-card dashboard-stat-card-danger dashboard-card-link ${activeStage === "plusplus" ? "dashboard-card-link-selected" : ""}`}
            >
              <span>Escalate++</span>
              <strong>{escalatePlusPlusFaults.length}</strong>
              <small>Management pressure stage</small>
            </Link>
          </div>
          {activeStage !== "all" ? (
            <div className="meta-row">
              <Link href="/dashboard/faults/escalations" className="tag dashboard-card-link">
                Clear Stage Filter
              </Link>
            </div>
          ) : null}
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Nudges</h2>
              <p>Recommended next pressure actions for admins today.</p>
            </div>
            <span className="status-chip status-chip-danger">Action</span>
          </div>
          <div className="dashboard-stack">
            {nudgeItems.map((item) => (
              <article key={item} className="dashboard-today-card">
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        </article>
      </section>
    </FaultsSubpageConsole>
  );
}
