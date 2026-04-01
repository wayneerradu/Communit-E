"use client";

import { useEffect, useState } from "react";

type PublicFault = {
  id: string;
  title: string;
  ethekwiniReference?: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "escalated" | "in-progress" | "closed" | "archived";
  locationText: string;
  createdAt?: string;
  escalatedAt?: string;
  firstInProgressAt?: string;
  closedAt?: string;
  updatedAt?: string;
};

type TileId =
  | "total-faults"
  | "open-faults"
  | "critical-open"
  | "resolved"
  | "avg-open-age"
  | "most-faults-category"
  | "most-responsive-category"
  | "oldest-fault-days"
  | "newest-fault"
  | "latest-overview";

type Props = {
  faults: PublicFault[];
};

function isOpenStatus(status: PublicFault["status"]) {
  return status === "escalated" || status === "in-progress";
}

function toDaysSince(dateIso?: string) {
  if (!dateIso) return 0;
  const ms = Date.now() - new Date(dateIso).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function getOpenAnchor(fault: PublicFault) {
  return fault.escalatedAt ?? fault.createdAt ?? fault.updatedAt;
}

function getCreatedAnchor(fault: PublicFault) {
  return fault.createdAt ?? fault.escalatedAt ?? fault.updatedAt;
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function stripStreetNumber(locationText: string) {
  const first = locationText.split(",")[0]?.trim() ?? locationText;
  return first.replace(/^\d+\s+/, "").trim() || first;
}

function getStatusForOverview(fault: PublicFault) {
  if (fault.status === "escalated") return "opened";
  if (fault.status === "in-progress") return "in-progress";
  if (fault.status === "closed") return "closed";
  return "fixed";
}

function getBadgeTone(status: PublicFault["status"]) {
  if (status === "escalated") return "danger";
  if (status === "in-progress") return "warning";
  if (status === "closed") return "success";
  return "default";
}

export function PublicDashboardConsole({ faults }: Props) {
  const [selectedTile, setSelectedTile] = useState<TileId>("latest-overview");
  const [rotationIndex, setRotationIndex] = useState(0);
  const rotationOrder = ["opened", "closed", "in-progress", "fixed"] as const;
  const rotatingStatus = rotationOrder[rotationIndex % rotationOrder.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRotationIndex((current) => (current + 1) % rotationOrder.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const openFaults = faults.filter((fault) => isOpenStatus(fault.status));
  const resolvedFaults = faults.filter((fault) => fault.status === "closed" || fault.status === "archived");
  const criticalOpenFaults = openFaults.filter((fault) => fault.priority === "critical");
  const averageOpenAgeDays =
    openFaults.length > 0
      ? Math.round(openFaults.reduce((sum, fault) => sum + toDaysSince(getOpenAnchor(fault)), 0) / openFaults.length)
      : 0;

  const byCategory = new Map<string, PublicFault[]>();
  for (const fault of faults) {
    const key = toTitleCase(fault.category);
    const bucket = byCategory.get(key) ?? [];
    bucket.push(fault);
    byCategory.set(key, bucket);
  }
  const categoriesByVolume = Array.from(byCategory.entries())
    .map(([category, list]) => ({ category, list, count: list.length }))
    .sort((a, b) => b.count - a.count);
  const mostFaultsCategory = categoriesByVolume[0];

  const categoryResponsiveness = Array.from(byCategory.entries())
    .map(([category, list]) => {
      const days = list
        .map((fault) => {
          const start = new Date(fault.escalatedAt ?? fault.createdAt ?? "").getTime();
          const end = new Date(fault.firstInProgressAt ?? fault.closedAt ?? "").getTime();
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
          return Math.round((end - start) / (1000 * 60 * 60 * 24));
        })
        .filter((value): value is number => value !== null);
      const averageDays =
        days.length > 0 ? Number((days.reduce((sum, day) => sum + day, 0) / days.length).toFixed(1)) : null;
      return { category, averageDays, list };
    })
    .filter((item) => item.averageDays !== null)
    .sort((a, b) => (a.averageDays ?? 999) - (b.averageDays ?? 999));
  const mostResponsiveCategory = categoryResponsiveness[0];

  const oldestOpenFault = [...openFaults].sort(
    (a, b) => toDaysSince(getOpenAnchor(b)) - toDaysSince(getOpenAnchor(a))
  )[0];
  const newestFault = [...faults].sort(
    (a, b) => new Date(getCreatedAnchor(b) ?? 0).getTime() - new Date(getCreatedAnchor(a) ?? 0).getTime()
  )[0];

  const rotatingFaults = [...faults]
    .filter((fault) => getStatusForOverview(fault) === rotatingStatus)
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
    )
    .slice(0, 6);

  const openedCount = faults.filter((fault) => getStatusForOverview(fault) === "opened").length;
  const closedCount = faults.filter((fault) => getStatusForOverview(fault) === "closed").length;
  const inProgressCount = faults.filter((fault) => getStatusForOverview(fault) === "in-progress").length;
  const fixedCount = faults.filter((fault) => getStatusForOverview(fault) === "fixed").length;

  const tiles: Array<{
    id: TileId;
    label: string;
    value: string;
    detail: string;
    tone: "default" | "danger" | "warning" | "success";
  }> = [
    { id: "total-faults", label: "Total Faults", value: String(faults.length), detail: "All Faults Escalated and Open", tone: "default" },
    { id: "open-faults", label: "Open Faults", value: String(openFaults.length), detail: "Faults in Progress", tone: "danger" },
    { id: "critical-open", label: "Critical Open", value: String(criticalOpenFaults.length), detail: "Open Critical Faults", tone: "warning" },
    { id: "resolved", label: "Resolved", value: String(resolvedFaults.length), detail: "Closed + archived", tone: "success" },
    { id: "avg-open-age", label: "Average Open Age", value: `${averageOpenAgeDays} days`, detail: "Across open faults", tone: "default" },
    {
      id: "most-faults-category",
      label: "Most Faults by Category",
      value: String(mostFaultsCategory?.count ?? 0),
      detail: mostFaultsCategory ? `${mostFaultsCategory.category}` : "No category data yet",
      tone: "warning"
    },
    {
      id: "most-responsive-category",
      label: "Most Responsive Category",
      value:
        mostResponsiveCategory?.averageDays !== undefined && mostResponsiveCategory?.averageDays !== null
          ? `${mostResponsiveCategory.averageDays} day`
          : "N/A",
      detail:
        mostResponsiveCategory?.category
          ? `${mostResponsiveCategory.category}`
          : "Not enough completed data",
      tone: "success"
    },
    {
      id: "oldest-fault-days",
      label: "Oldest Fault in Days",
      value: oldestOpenFault ? `${toDaysSince(getOpenAnchor(oldestOpenFault))} days` : "0 days",
      detail: oldestOpenFault?.ethekwiniReference ?? "No open faults",
      tone: "danger"
    },
    {
      id: "newest-fault",
      label: "Newest Fault",
      value: newestFault?.ethekwiniReference ?? "N/A",
      detail: newestFault?.title ?? "No faults recorded",
      tone: "default"
    },
    {
      id: "latest-overview",
      label: "Latest Faults Overview",
      value: rotatingStatus === "opened" ? "Opened" : rotatingStatus === "closed" ? "Closed" : rotatingStatus === "in-progress" ? "In Progress" : "Fixed",
      detail: "Realtime Update",
      tone: "default"
    }
  ];

  const selectedTileMeta = tiles.find((tile) => tile.id === selectedTile) ?? tiles[0];

  let detailTitle = selectedTileMeta.label;
  let detailItems: PublicFault[] = [];
  let detailHint = selectedTileMeta.detail;

  if (selectedTile === "total-faults") {
    detailItems = [...faults]
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
      .slice(0, 12);
    detailHint = "Showing latest recorded faults";
  } else if (selectedTile === "open-faults") {
    detailItems = [...openFaults].sort((a, b) => toDaysSince(getOpenAnchor(b)) - toDaysSince(getOpenAnchor(a))).slice(0, 12);
    detailHint = "Showing currently open faults";
  } else if (selectedTile === "critical-open") {
    detailItems = [...criticalOpenFaults].sort((a, b) => toDaysSince(getOpenAnchor(b)) - toDaysSince(getOpenAnchor(a))).slice(0, 12);
    detailHint = "Showing currently open critical faults";
  } else if (selectedTile === "resolved") {
    detailItems = [...resolvedFaults].sort((a, b) => new Date(b.closedAt ?? b.updatedAt ?? 0).getTime() - new Date(a.closedAt ?? a.updatedAt ?? 0).getTime()).slice(0, 12);
    detailHint = "Showing recently resolved faults";
  } else if (selectedTile === "avg-open-age") {
    detailItems = [...openFaults].sort((a, b) => toDaysSince(getOpenAnchor(b)) - toDaysSince(getOpenAnchor(a))).slice(0, 12);
    detailHint = `Average open age is ${averageOpenAgeDays} days`;
  } else if (selectedTile === "most-faults-category") {
    detailItems = mostFaultsCategory?.list.slice(0, 12) ?? [];
    detailHint = mostFaultsCategory ? `${mostFaultsCategory.category} currently has the highest volume` : "No category data yet";
  } else if (selectedTile === "most-responsive-category") {
    detailItems = mostResponsiveCategory?.list.slice(0, 12) ?? [];
    detailHint =
      mostResponsiveCategory?.averageDays !== undefined && mostResponsiveCategory?.averageDays !== null
        ? `${mostResponsiveCategory.category} averages ${mostResponsiveCategory.averageDays} day(s) to first response`
        : "Not enough response data yet";
  } else if (selectedTile === "oldest-fault-days") {
    detailItems = oldestOpenFault ? [oldestOpenFault] : [];
    detailHint = oldestOpenFault
      ? `Oldest open fault has been open ${toDaysSince(getOpenAnchor(oldestOpenFault))} day(s)`
      : "No open faults";
  } else if (selectedTile === "newest-fault") {
    detailItems = newestFault ? [newestFault] : [];
    detailHint = newestFault
      ? `Latest fault captured ${toDaysSince(getCreatedAnchor(newestFault))} day(s) ago`
      : "No fault records found";
  } else {
    detailItems = rotatingFaults;
    detailHint = `Rotating view: Opened ${openedCount} · Closed ${closedCount} · In Progress ${inProgressCount} · Fixed ${fixedCount}`;
  }

  return (
    <main className="public-join-shell">
      <section className="public-join-card">
        <header className="page-header">
          <div>
            <span className="public-join-eyebrow">Public Dashboard</span>
            <h1>Mount Vernon Faults Dashboard</h1>
            <p>
              Open Faults Overview, if your Fault does not appear here, please email hello@unityincommunity.org.za.
            </p>
          </div>
        </header>

        <section className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Public Instructions</h2>
              <div className="public-instructions-copy">
                <p>
                  Click on the Tile Below to see the latest information on Escalated Faults. Only Faults Escalated to us
                  via Email appear in our System.
                </p>
                <hr className="public-instructions-divider" />
                <p>
                  The Onus lies with the Councillor and the Department to Action and Update us and we are bound by their
                  Resource planning, Execution and Direction.
                </p>
                <hr className="public-instructions-divider" />
                <p>
                  All Private Details have been stripped off as this is a Public Dashboard.
                </p>
                <p>
                  Please contact us on <strong>hello@unityincommunity.org.za</strong> to:
                </p>
                <table className="public-instructions-table">
                  <tbody>
                    <tr>
                      <td>1.</td>
                      <td>Escalate your Fault</td>
                    </tr>
                    <tr>
                      <td>2.</td>
                      <td>Feedback on the Status of your Fault</td>
                    </tr>
                    <tr>
                      <td>3.</td>
                      <td>Close the Fault</td>
                    </tr>
                    <tr>
                      <td>4.</td>
                      <td>Reopen the Fault</td>
                    </tr>
                    <tr>
                      <td>5.</td>
                      <td>If your fault does not appear here</td>
                    </tr>
                  </tbody>
                </table>
                <hr className="public-instructions-divider" />
                <p className="public-instructions-footer">
                  <strong>
                    Thank you in advance for working with us. Visit{" "}
                    <a href="https://www.unityincommunity.org.za" target="_blank" rel="noreferrer">
                      www.unityincommunity.org.za
                    </a>{" "}
                    to get involved
                  </strong>
                </p>
              </div>
            </div>
            <span className="status-chip status-chip-default">Info</span>
          </div>
        </section>

        <section className="dashboard-stat-grid dashboard-stat-grid-five public-dashboard-tiles">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className={`dashboard-stat-card dashboard-stat-card-${tile.tone} dashboard-card-link ${
                selectedTile === tile.id ? "dashboard-card-focus" : ""
              }`}
              onClick={() => setSelectedTile(tile.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <span>{tile.label}</span>
              <strong
                className={
                  tile.id === "newest-fault" || tile.id === "latest-overview"
                    ? "public-dashboard-tile-value-compact"
                    : undefined
                }
              >
                {tile.value}
              </strong>
              <small>{tile.detail}</small>
            </button>
          ))}
        </section>

        <section className="dashboard-feature-grid public-dashboard-detail-row">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>{detailTitle}</h2>
                <p>{detailHint}</p>
              </div>
              <span className="status-chip status-chip-default">{detailItems.length} item(s)</span>
            </div>
            <div className="dashboard-stack">
              {detailItems.length > 0 ? (
                detailItems.map((fault) => (
                  <article key={fault.id} className="dashboard-queue-card">
                    <div className="panel-head">
                      <div>
                        <h3>{fault.title}</h3>
                        <p>
                          {fault.ethekwiniReference ?? fault.id} · {toTitleCase(fault.category)}
                        </p>
                      </div>
                      <span className={`status-chip status-chip-${getBadgeTone(fault.status)}`}>
                        {fault.status === "in-progress"
                          ? "In Progress"
                          : fault.status === "escalated"
                            ? "Opened"
                            : fault.status === "closed"
                              ? "Closed"
                              : "Fixed"}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="tag">{stripStreetNumber(fault.locationText)}</span>
                      <span className="tag">Priority: {fault.priority}</span>
                      <span className="tag">Updated {toDaysSince(fault.updatedAt ?? fault.createdAt)} day(s) ago</span>
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>No faults available for this view yet.</strong>
                </article>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
