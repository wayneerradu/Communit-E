import Link from "next/link";
import type { Route } from "next";
import { getSessionUser } from "@/lib/auth";
import { UserBadge } from "@/components/shared/user-badge";
import { getDashboardData, getMeetingsData, getProjectsData, getResolutionsData } from "@/lib/hub-data";

export default async function MyWorkPage() {
  const [user, dashboardData, projectsData, meetingsData, resolutionsData] = await Promise.all([
    getSessionUser(),
    getDashboardData(),
    getProjectsData(),
    getMeetingsData(),
    getResolutionsData()
  ]);

  const firstName = user?.name.split(" ")[0] ?? "Admin";
  const userName = user?.name ?? "Admin";
  const myFaults = dashboardData.activeFaults.filter((fault) => fault.assignedAdminName === userName).slice(0, 5);
  const myTasks = projectsData.projects
    .flatMap((project) =>
      project.tasks
        .filter((task) => task.assignee === userName && task.status !== "done")
        .map((task) => ({ ...task, projectTitle: project.title }))
    )
    .slice(0, 6);
  const myApprovals = dashboardData.prQueue.slice(0, 4);
  const myMeetingActions = meetingsData.minutes
    .flatMap((minute) =>
      minute.actionItems
        .filter((item) => item.ownerEmail === user?.email && item.status !== "done")
        .map((item) => ({ ...item, minuteTitle: minute.title, minuteId: minute.id }))
    )
    .slice(0, 4);
  const openResolutions = resolutionsData.resolutions.filter((resolution) => resolution.status === "open").slice(0, 4);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>My Work</h1>
          <p>Personalised view of what needs your attention today.</p>
        </div>
      </header>

      <section className="dashboard-stat-grid">
        <Link href={`/dashboard/faults?from=my-work&queue=assigned&focus=${myFaults[0]?.id ?? ""}&action=follow-up&context=My%20Work%20opened%20your%20assigned%20faults%20so%20you%20can%20move%20them%20forward.` as Route} className="dashboard-stat-card dashboard-stat-card-danger dashboard-card-link">
          <span>My Faults</span>
          <strong>{myFaults.length}</strong>
          <small>Assigned incidents needing movement</small>
        </Link>
        <Link href={`/dashboard/projects/my-projects-tasks?from=my-work&queue=blocked&action=update&context=My%20Work%20opened%20your%20project%20tasks%20so%20you%20can%20update%20or%20unstick%20them.` as Route} className="dashboard-stat-card dashboard-stat-card-warning dashboard-card-link">
          <span>My Project Tasks</span>
          <strong>{myTasks.length}</strong>
          <small>Open tasks across active projects</small>
        </Link>
        <Link href={`/dashboard/pro?from=my-work&queue=approvals&focus=${myApprovals[0]?.id ?? ""}&action=approve&context=My%20Work%20opened%20your%20communications%20approval%20queue.` as Route} className="dashboard-stat-card dashboard-stat-card-default dashboard-card-link">
          <span>My Approvals</span>
          <strong>{myApprovals.length}</strong>
          <small>Communications waiting for review</small>
        </Link>
        <Link href={`/dashboard/meetings?from=my-work&focus=${myMeetingActions[0]?.minuteId ?? meetingsData.minutes[0]?.id ?? ""}&action=review&context=My%20Work%20opened%20your%20meeting%20actions%20for%20follow-up.` as Route} className="dashboard-stat-card dashboard-stat-card-success dashboard-card-link">
          <span>Meeting Actions</span>
          <strong>{myMeetingActions.length}</strong>
          <small>Minute actions assigned to you</small>
        </Link>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>My Faults</h2>
              <p>Faults assigned to you that needs your attention and resolution.</p>
            </div>
            <span className="status-chip status-chip-danger">Action</span>
          </div>
          <div className="dashboard-stack">
            {myFaults.length > 0 ? (
              myFaults.map((fault) => (
                <Link
                  key={fault.id}
                  href={`/dashboard/faults?from=my-work&queue=assigned&focus=${fault.id}&action=follow-up&context=My%20Work%20opened%20this%20fault%20because%20it%20is%20assigned%20to%20you.` as Route}
                  className="dashboard-queue-card dashboard-card-link"
                >
                  <div className="panel-head">
                    <div>
                      <h3>{fault.title}</h3>
                      <p>{fault.locationText}</p>
                    </div>
                    <span className={`status-chip status-chip-${fault.priority === "critical" ? "danger" : "warning"}`}>{fault.priority}</span>
                  </div>
                  <div className="meta-row">
                    <span className="tag">{fault.id}</span>
                    <span className="tag">{fault.status}</span>
                    <div className="tag tag-user-badge">
                      <UserBadge name={fault.assignedAdminName} currentUser={user} compact />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No faults are assigned to you right now.</strong>
              </article>
            )}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>My Project Tasks</h2>
              <p>Tasks across projects that are waiting on your follow-through.</p>
            </div>
            <span className="status-chip status-chip-warning">In Motion</span>
          </div>
          <div className="dashboard-stack">
            {myTasks.length > 0 ? (
              myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/projects/my-projects-tasks?from=my-work&queue=blocked&action=update&context=My%20Work%20opened%20your%20project%20tasks%20so%20you%20can%20update%20them%20quickly.` as Route}
                  className="dashboard-approval-card dashboard-card-link"
                >
                  <div className="panel-head">
                    <h3>{task.title}</h3>
                    <span className="status-chip status-chip-default">{task.status}</span>
                  </div>
                  <p>{task.projectTitle}</p>
                  <UserBadge name={task.assignee} currentUser={user} compact />
                </Link>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No active project tasks are assigned to you.</strong>
              </article>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Approvals And Resolutions</h2>
              <p>Decisions that you need to make today.</p>
            </div>
          </div>
          <div className="dashboard-stack">
            <div className="section-header">
              <div>
                <h3>Approvals</h3>
                <p>Outgoing Public Communicatiion needing your approval.</p>
              </div>
              <span className="status-chip status-chip-warning">Needs Approval</span>
            </div>
            {myApprovals.length > 0 ? (
              myApprovals.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/pro?from=my-work&queue=approvals&focus=${item.id}&action=approve&context=My%20Work%20opened%20this%20communication%20item%20because%20it%20needs%20your%20approval.` as Route}
                  className="dashboard-approval-card dashboard-card-link"
                >
                  <div className="panel-head">
                    <div>
                      <span className="status-chip status-chip-warning">Approval</span>
                      <h3>{item.headline}</h3>
                    </div>
                    <span className="status-chip status-chip-warning">{item.appCount}/3 approvals</span>
                  </div>
                  <p>{item.channel}</p>
                  <div className="meta-row">
                    <span className="tag">Review Approval</span>
                  </div>
                </Link>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No approvals are waiting for you right now.</strong>
              </article>
            )}
            <div className="section-header">
              <div>
                <h3>Resolutions Requiring Your Vote</h3>
                <p>We require your vote to finalise this resolution.</p>
              </div>
              <span className="status-chip status-chip-default">Vote Required</span>
            </div>
            {openResolutions.length > 0 ? (
              openResolutions.map((resolution) => (
                <Link
                  key={resolution.id}
                  href={`/dashboard/resolutions?from=my-work&focus=${resolution.id}&action=vote&context=My%20Work%20opened%20this%20resolution%20because%20it%20still%20needs%20a%20vote.` as Route}
                  className="dashboard-minute-card dashboard-card-link"
                >
                  <div className="panel-head">
                    <div>
                      <span className="status-chip status-chip-default">Resolution</span>
                      <h3>{resolution.title}</h3>
                    </div>
                    <span className="status-chip status-chip-default">Vote Required</span>
                  </div>
                  <p>{resolution.description}</p>
                  <div className="meta-row">
                    <span className="tag">Cast Vote</span>
                  </div>
                </Link>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No open resolutions currently need your vote.</strong>
              </article>
            )}
          </div>
        </article>

        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Meeting Actions</h2>
              <p>Action Items from Meetings that need your action and follow through.</p>
            </div>
          </div>
          <div className="dashboard-stack">
            {myMeetingActions.length > 0 ? (
              myMeetingActions.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/meetings?from=my-work&focus=${item.minuteId}&action=review&context=My%20Work%20opened%20this%20meeting%20action%20because%20it%20is%20assigned%20to%20you.` as Route}
                  className="dashboard-minute-card dashboard-card-link"
                >
                  <div className="panel-head">
                    <h3>{item.title}</h3>
                    <span className="status-chip status-chip-default">{item.status}</span>
                  </div>
                  <p>{item.minuteTitle}</p>
                </Link>
              ))
            ) : (
              <article className="dashboard-today-card">
                <strong>No meeting actions are assigned to you.</strong>
              </article>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
