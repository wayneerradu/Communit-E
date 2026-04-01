"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/types/domain";

function toProjectAgeDays(project: Project) {
  const parseDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const created = parseDate(project.createdAt);
  if (created) {
    return Math.max(0, Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const match = project.projectRef?.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (!match) return 0;
  const [, dd, mm, yy] = match;
  const parsed = new Date(Number(`20${yy}`), Number(mm) - 1, Number(dd));
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
}

export function ProjectsOverviewConsole({ projects }: { projects: Project[] }) {
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const now = Date.now();
  const tasks = useMemo(() => projects.flatMap((project) => project.tasks.map((task) => ({ task, project }))), [projects]);
  const openProjects = projects.filter((project) => project.status !== "completed" && project.status !== "archived");
  const activeProjects = projects.filter((project) => project.status === "active");
  const blockedProjects = projects.filter((project) => project.status === "blocked");
  const ages = openProjects.map(toProjectAgeDays);
  const newestAge = ages.length > 0 ? Math.min(...ages) : 0;
  const oldestAge = ages.length > 0 ? Math.max(...ages) : 0;
  const adminProjectCounts = projects.reduce<Record<string, number>>((acc, project) => {
    const key = project.assignedAdminName || "Unassigned";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mostLoadedAdmin = Object.entries(adminProjectCounts).sort((a, b) => b[1] - a[1])[0] ?? ["Unassigned", 0];
  const openTasks = tasks.filter(({ task }) => task.status !== "done");
  const blockedTasks = tasks.filter(({ task }) => task.status === "blocked");
  const overdueTasks = tasks.filter(({ task }) => task.status !== "done" && task.dueDate && new Date(task.dueDate).getTime() < now);
  const taskAges = openTasks.map(({ task }) => {
    const anchor = task.createdAt || task.updatedAt;
    if (!anchor) return 0;
    return Math.max(0, Math.floor((now - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24)));
  });
  const oldestTaskAge = taskAges.length > 0 ? Math.max(...taskAges) : 0;
  const doneLast30d = tasks.filter(({ task }) => task.status === "done" && task.updatedAt && now - new Date(task.updatedAt).getTime() <= 30 * 24 * 60 * 60 * 1000).length;

  const mostActiveAdmin = Object.entries(
    tasks.reduce<Record<string, number>>((acc, { task }) => {
      const key = task.assignee || "Unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0] ?? ["Unassigned", 0];

  const projectsNoRecentUpdates = openProjects.filter((project) => {
    const updated = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
    return updated > 0 && now - updated > 14 * 24 * 60 * 60 * 1000;
  }).length;
  const projectsOver30d = openProjects.filter((project) => toProjectAgeDays(project) > 30).length;
  const projectsOver90d = openProjects.filter((project) => toProjectAgeDays(project) > 90).length;
  const latestProjectUpdate = [...projects]
    .filter((project) => project.updatedAt)
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())[0];
  const latestTaskUpdate = [...tasks]
    .filter(({ task }) => task.updatedAt)
    .sort((a, b) => new Date(b.task.updatedAt ?? 0).getTime() - new Date(a.task.updatedAt ?? 0).getTime())[0];

  const nudges = [
    { title: "Overdue Tasks", detail: `${overdueTasks.length} overdue task(s) need immediate follow-up.`, href: "/dashboard/projects/manager?queue=overdue&action=review" as Route },
    { title: "Projects Open > 1 Month", detail: `${projectsOver30d} project(s) have been open for more than 30 days.`, href: "/dashboard/projects/manager?queue=aging30&action=review" as Route },
    { title: "Projects Open > 3 Months", detail: `${projectsOver90d} project(s) have been open for more than 90 days.`, href: "/dashboard/projects/manager?queue=aging90&action=review" as Route },
    { title: "No Recent Updates", detail: `${projectsNoRecentUpdates} project(s) have not been updated in 14+ days.`, href: "/dashboard/projects/manager?queue=stale&action=review" as Route },
    { title: "Most Active Admin", detail: `${mostActiveAdmin[0]} is handling ${mostActiveAdmin[1]} task(s).`, href: "/dashboard/projects/manager?queue=workload&action=review" as Route },
    {
      title: "Latest Project Update",
      detail: latestProjectUpdate ? `${latestProjectUpdate.title} updated ${new Date(latestProjectUpdate.updatedAt ?? "").toLocaleString("en-ZA")}.` : "No project updates yet.",
      href: "/dashboard/projects/manager?queue=recent&action=review" as Route
    },
    {
      title: "Latest Task Update",
      detail: latestTaskUpdate ? `${latestTaskUpdate.task.title} (${latestTaskUpdate.project.title}) updated ${new Date(latestTaskUpdate.task.updatedAt ?? "").toLocaleString("en-ZA")}.` : "No task updates yet.",
      href: "/dashboard/projects/manager?queue=recent&action=review" as Route
    }
  ];

  useEffect(() => {
    if (nudges.length <= 1) return;
    const timer = window.setInterval(() => {
      setNudgeIndex((current) => (current + 1) % nudges.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [nudges.length]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Projects Hub</h1>
          <p>Overview of project and task performance across the full delivery pipeline.</p>
        </div>
      </header>

      <section className="dashboard-stat-grid">
        <Link href={"/dashboard/projects/manager?queue=workload&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-default dashboard-card-link">
          <span>Most Loaded Admin</span>
          <strong>{mostLoadedAdmin[0]}</strong>
          <small>{mostLoadedAdmin[1]} project(s)</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=blocked&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-danger dashboard-card-link">
          <span>Blocked Projects</span>
          <strong>{blockedProjects.length}</strong>
          <small>Need unblock actions</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=active&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-success dashboard-card-link">
          <span>Active Projects</span>
          <strong>{activeProjects.length}</strong>
          <small>Currently in flight</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=oldest&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-warning dashboard-card-link">
          <span>Oldest Project</span>
          <strong>{oldestAge}d</strong>
          <small>Open age in days</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=newest&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-default dashboard-card-link">
          <span>Newest Project</span>
          <strong>{newestAge}d</strong>
          <small>Age in days</small>
        </Link>
      </section>

      <section className="dashboard-stat-grid">
        <Link href={"/dashboard/projects/manager?queue=tasks-open&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-success dashboard-card-link">
          <span>Open Tasks</span>
          <strong>{openTasks.length}</strong>
          <small>Tasks still in progress</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=tasks-blocked&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-danger dashboard-card-link">
          <span>Blocked Tasks</span>
          <strong>{blockedTasks.length}</strong>
          <small>Need intervention</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=tasks-overdue&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-warning dashboard-card-link">
          <span>Overdue Tasks</span>
          <strong>{overdueTasks.length}</strong>
          <small>Past due date</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=tasks-oldest&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-default dashboard-card-link">
          <span>Oldest Task</span>
          <strong>{oldestTaskAge}d</strong>
          <small>Open age in days</small>
        </Link>
        <Link href={"/dashboard/projects/manager?queue=tasks-done30&action=review" as Route} className="dashboard-stat-card dashboard-stat-card-default dashboard-card-link">
          <span>Tasks Done (30d)</span>
          <strong>{doneLast30d}</strong>
          <small>Completed in last month</small>
        </Link>
      </section>

      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Project Nudges</h2>
              <p>Priority prompts rotate across overdue, aging, and stale work items.</p>
            </div>
            <button className="button-secondary" type="button" onClick={() => setNudgeIndex((current) => (current + 1) % nudges.length)}>
              Next Nudge
            </button>
          </div>
          <Link href={nudges[nudgeIndex]?.href ?? ("/dashboard/projects/manager" as Route)} className="dashboard-queue-card dashboard-card-link">
            <div className="panel-head">
              <div>
                <h3>{nudges[nudgeIndex]?.title ?? "Nudges"}</h3>
                <p>{nudges[nudgeIndex]?.detail ?? "No nudge available."}</p>
              </div>
              <span className="status-chip status-chip-warning">Attention</span>
            </div>
          </Link>
        </article>
      </section>
    </>
  );
}
