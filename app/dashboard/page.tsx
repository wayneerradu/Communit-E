import Link from "next/link";
import type { Route } from "next";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData, getFaultsData, getInfrastructureData, getProjectsData, getResidentsData } from "@/lib/hub-data";
import { readUserProfile } from "@/lib/user-profile-store";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem } from "@/types/domain";

function getGreetingByTime(date: Date) {
  const hour = date.getHours();

  if (hour < 4) {
    return "Why arent you sleeping";
  }

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  if (hour < 20) {
    return "Good evening";
  }

  if (hour < 22) {
    return "Go to Sleep";
  }

  return "Why arent you sleeping";
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const { cards, pendingResidents, activeFaults, prQueue, minutes, calendarItems, notifications } = await getDashboardData(user?.email);
  const [{ residents }, { faults }, { assets }, { projects }] = await Promise.all([
    getResidentsData(),
    Promise.resolve(getFaultsData()),
    Promise.resolve(getInfrastructureData()),
    Promise.resolve(getProjectsData())
  ]);
  const profile = user ? await readUserProfile(user.email) : null;
  const greetingName = profile?.nickname?.trim() || user?.name || "Admin";
  const greeting = getGreetingByTime(new Date());
  const firstOpenFault = activeFaults[0];
  const secondOpenFault = activeFaults[1];
  const firstPendingResident = pendingResidents[0];
  const firstPrItem = prQueue[0];
  const queueItems = [
    {
      title: firstOpenFault?.title ?? "Streetlight outage on Palm Crescent",
      detail: "Escalate+ due now",
      status: "Due",
      tone: "danger",
      meta: `Ref# ${firstOpenFault?.id ?? "fault-1"}`,
      href: (`/dashboard/faults?from=dashboard&queue=due&focus=${firstOpenFault?.id ?? "fault-1"}&action=escalate&context=Priority%20queue%20sent%20you%20here%20to%20review%20an%20escalation%20due%20today.`) as Route
    },
    {
      title: firstPendingResident?.name ?? "Resident application pending",
      detail: "WhatsApp confirmation still needed",
      status: "Pending",
      tone: "warning",
      meta: "Resident verification",
      href: (`/dashboard/residents?from=dashboard&queue=pending&focus=${firstPendingResident?.id ?? "resident-1"}&action=approve&context=Priority%20queue%20sent%20you%20here%20to%20finish%20a%20resident%20approval.`) as Route
    },
    {
      title: "Bellair Primary school task",
      detail: "No project update in 6 days",
      status: "Needs Help",
      tone: "warning",
      meta: "Projects Hub",
      href: "/dashboard/projects/manager?from=dashboard&queue=blocked&action=update&context=Priority%20queue%20sent%20you%20here%20to%20unstick%20a%20project%20task%20that%20needs%20help." as Route
    }
  ];

  const cardLinks = {
    "Pending Residents": "/dashboard/residents?from=dashboard&queue=pending&action=review&context=Admin%20Dashboard%20opened%20the%20pending%20resident%20queue%20for%20review." as Route,
    "Active Faults": "/dashboard/faults?from=dashboard&queue=open&action=review&context=Admin%20Dashboard%20opened%20the%20open%20fault%20queue%20for%20review." as Route,
    "PR Queue": "/dashboard/pro?from=dashboard&queue=approvals&action=approve&context=Admin%20Dashboard%20opened%20the%20communications%20approval%20queue." as Route,
    "Communication need Approval": `/dashboard/pro?from=dashboard&queue=approvals&focus=${firstPrItem?.id ?? "pr-1"}&action=approve&context=Admin%20Dashboard%20opened%20the%20communications%20approval%20queue%20for%20review.` as Route,
    "Minutes Logged": "/dashboard/meetings?from=dashboard&queue=minutes&action=review&context=Admin%20Dashboard%20opened%20recent%20meeting%20minutes%20for%20review." as Route,
    "Critical Faults": `/dashboard/faults?from=dashboard&queue=critical&focus=${firstOpenFault?.id ?? "fault-1"}&action=escalate&context=Admin%20Dashboard%20opened%20the%20critical%20fault%20queue%20for%20urgent%20attention.` as Route
  } as const;

  const todayItems = [
    ...calendarItems.map((item) => ({
      label: item.label,
      href: item.href.startsWith("http") ? item.href : (item.href as Route),
      external: item.href.startsWith("http")
    })),
    { label: "Birthday reminder and assistant prompts", href: "/dashboard/my-profile" as Route, external: false }
  ];

  const searchItems: GlobalSearchItem[] = [
    ...residents.map((resident) => ({
      id: `resident-${resident.id}`,
      title: resident.name,
      subtitle: [resident.addressLine1, resident.phone, resident.standNo].filter(Boolean).join(" • "),
      kind: "resident" as const,
      href: (`/dashboard/residents?from=dashboard-search&focus=${resident.id}&action=review&context=Global%20search%20opened%20this%20resident%20record%20for%20review.`) as Route,
      keywords: [resident.email, resident.suburb, resident.notes].filter(Boolean) as string[]
    })),
    ...faults.map((fault) => ({
      id: `fault-${fault.id}`,
      title: `${fault.id} • ${fault.title}`,
      subtitle: [fault.locationText, fault.category, fault.priority].filter(Boolean).join(" • "),
      kind: "fault" as const,
      href: (`/dashboard/faults?from=dashboard-search&focus=${fault.id}&action=review&context=Global%20search%20opened%20this%20fault%20record%20for%20review.`) as Route,
      keywords: [fault.description, fault.reporterEmail].filter(Boolean)
    })),
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.title,
      subtitle: [project.status, project.description].filter(Boolean).join(" • "),
      kind: "project" as const,
      href: (`/dashboard/projects/manager?from=dashboard-search&focus=${project.id}&action=review&context=Global%20search%20opened%20this%20project%20for%20review.`) as Route,
      keywords: project.tasks.map((task) => [task.title, task.assignee, task.status].filter(Boolean).join(" ")).filter(Boolean)
    })),
    ...assets.map((asset) => ({
      id: `asset-${asset.id}`,
      title: asset.assetName,
      subtitle: [asset.street, asset.assetType, asset.condition].filter(Boolean).join(" • "),
      kind: "infrastructure" as const,
      href: (`/dashboard/infrastructure?from=dashboard-search&focus=${asset.id}&action=review&context=Global%20search%20opened%20this%20infrastructure%20asset%20for%20review.`) as Route,
      keywords: [asset.notes].filter(Boolean) as string[]
    })),
    ...Array.from(
      new Set(
        [
          ...residents.map((resident) => resident.addressLine1 || resident.suburb || ""),
          ...faults.map((fault) => fault.locationText || ""),
          ...assets.map((asset) => asset.street || "")
        ]
          .map((value) => value.trim())
          .filter(Boolean)
      )
    ).map((road) => ({
      id: `road-${road.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: road,
      subtitle: "Road and area match",
      kind: "road" as const,
      href: (`/dashboard/infrastructure?from=dashboard-search&road=${encodeURIComponent(road)}&action=review&context=Global%20search%20opened%20this%20road%20view%20for%20infrastructure%20and%20fault%20context.`) as Route,
      keywords: ["road", "area", "address"]
    }))
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{greeting}, {greetingName}</h1>
          <p>There are {activeFaults.length} active faults, {pendingResidents.length} residents waiting, and {prQueue.length} communication item(s) needing attention.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} />
          <Link href="/dashboard/residents" className="button-secondary">Residents</Link>
          <Link href="/dashboard/faults" className="button-secondary">Faults</Link>
        </div>
      </header>

      <section className="dashboard-stat-grid">
        {cards.map((card) => {
          const href = cardLinks[card.label as keyof typeof cardLinks] ?? "/dashboard";

          return (
            <Link
              key={card.label}
              href={href}
              className={`dashboard-stat-card dashboard-stat-card-${card.tone ?? "default"} dashboard-card-link`}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Priority Work Queue</h2>
              <p>Action Items needing attention today.</p>
            </div>
            <span className="status-chip status-chip-warning">Action Today</span>
          </div>
          <div className="dashboard-stack">
            {queueItems.map((item) => (
              <Link key={item.title} href={item.href} className="dashboard-queue-card dashboard-card-link">
                <div className="panel-head">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <span className={`status-chip status-chip-${item.tone}`}>{item.status}</span>
                </div>
                <div className="meta-row">
                  <span className="tag">{item.meta}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Today</h2>
              <p>Today's reminders and notifications are brought together on the home screen.</p>
            </div>
            <span className="status-chip status-chip-success">In Sync</span>
          </div>
          <div className="dashboard-stack">
            {todayItems.length > 0 ? (
              todayItems.map((item) =>
                item.external ? (
                  <a key={item.label} href={item.href} className="dashboard-today-card dashboard-card-link" target="_blank" rel="noreferrer">
                    <strong>{item.label}</strong>
                  </a>
                ) : (
                  <Link key={item.label} href={item.href as Route} className="dashboard-today-card dashboard-card-link">
                    <strong>{item.label}</strong>
                  </Link>
                )
              )
            ) : (
              <article className="dashboard-today-card">
                <strong>No live calendar or reminder items are connected yet.</strong>
              </article>
            )}
            <article className="dashboard-assistant-card">
              <strong>Assistant Tip</strong>
              <p>Approve the ready residents first, then tackle the two escalations due today so nothing rolls into tomorrow unnecessarily.</p>
            </article>
            {notifications.map((item) => (
              <article key={item.id} className="dashboard-today-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Residents Waiting</h2>
              <p>Keep approvals visible from the dashboard so onboarding momentum stays high.</p>
            </div>
          </div>
          <div className="dashboard-stack">
            {pendingResidents.map((resident) => (
              <Link
                key={resident.id}
                href={`/dashboard/residents?from=dashboard&queue=pending&focus=${resident.id}&action=approve&context=Admin%20Dashboard%20opened%20this%20resident%20record%20because%20it%20still%20needs%20review.` as Route}
                className="dashboard-resident-card dashboard-card-link"
              >
                <div className="panel-head">
                  <div>
                    <h3>{resident.name}</h3>
                    <p>{resident.addressLine1 ?? resident.standNo}</p>
                  </div>
                  <span className="status-chip status-chip-warning">Pending</span>
                </div>
                <div className="meta-row">
                  <span className="tag">{resident.phone ?? "Mobile pending"}</span>
                  <span className="tag">{resident.email ?? "Email pending"}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Approvals And Minutes</h2>
              <p>Communications and meeting outcomes stay visible so governance does not disappear into chat.</p>
            </div>
          </div>
          <div className="dashboard-stack">
            {prQueue.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/pro?from=dashboard&queue=approvals&focus=${item.id}&action=approve&context=Admin%20Dashboard%20opened%20this%20communication%20item%20because%20it%20needs%20approval.` as Route}
                className="dashboard-approval-card dashboard-card-link"
              >
                <div className="panel-head">
                  <h3>{item.headline}</h3>
                  <span className="status-chip status-chip-warning">{item.appCount}/3 approvals</span>
                </div>
                <p>{item.body}</p>
              </Link>
            ))}
            {minutes.slice(0, 1).map((minute) => (
              <Link
                key={minute.id}
                href={`/dashboard/meetings?from=dashboard&focus=${minute.id}&action=review&context=Admin%20Dashboard%20opened%20this%20meeting%20minute%20for%20follow-up%20and%20governance%20review.` as Route}
                className="dashboard-minute-card dashboard-card-link"
              >
                <div className="panel-head">
                  <h3>{minute.title}</h3>
                  <span className="status-chip status-chip-default">{minute.actionItems.length} actions</span>
                </div>
                <p>{minute.notes}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
