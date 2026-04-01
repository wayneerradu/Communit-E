"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { GlobalSearchItem, ParkingLotIdea, Project, ProjectTask, SessionUser } from "@/types/domain";

type ProjectsConsoleProps = {
  initialProjects: Project[];
  parkingLotIdeas: ParkingLotIdea[];
  currentUser: SessionUser | null;
  projectAdmins: SessionUser[];
  mode?: "manager" | "my";
  heading?: string;
  description?: string;
  focusProjectId?: string;
  focusQueue?: string;
  focusAction?: string;
  contextMessage?: string;
};

const projectFormDefaults = {
  title: "",
  description: "",
  assignedAdminEmail: "",
  assignedAdminName: "",
  priority: "medium" as NonNullable<Project["priority"]>,
  status: "planned" as Project["status"],
  timelineStart: "",
  timelineEnd: ""
};

const taskFormDefaults = {
  title: "",
  assignee: "",
  assigneeEmail: "",
  dueDate: "",
  status: "todo" as ProjectTask["status"]
};

const projectWorkspaceDefaults = {
  title: "",
  description: "",
  assignedAdminEmail: "",
  assignedAdminName: "",
  priority: "medium" as NonNullable<Project["priority"]>,
  status: "planned" as Project["status"],
  timelineStart: "",
  timelineEnd: ""
};

const taskWorkspaceDefaults = {
  title: "",
  assignee: "",
  assigneeEmail: "",
  dueDate: "",
  status: "todo" as ProjectTask["status"]
};

const laneOrder: Array<{ title: string; status: ProjectTask["status"] }> = [
  { title: "Not Started", status: "todo" },
  { title: "Started", status: "started" },
  { title: "In Progress", status: "in-progress" },
  { title: "Stuck", status: "blocked" },
  { title: "Complete", status: "done" }
];

const projectLaneOrder: Array<{ title: string; status: Project["status"] }> = [
  { title: "Planned", status: "planned" },
  { title: "Active", status: "active" },
  { title: "Blocked", status: "blocked" },
  { title: "Completed", status: "completed" },
  { title: "Archived", status: "archived" }
];

export function ProjectsConsole({
  initialProjects,
  parkingLotIdeas,
  currentUser,
  projectAdmins,
  mode = "manager",
  heading = "Projects Hub",
  description = "Track long-term work that is not a fault, keep tasks moving, surface blockers quickly, and help each other finish what matters.",
  focusProjectId,
  focusQueue,
  focusAction,
  contextMessage
}: ProjectsConsoleProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState(projectFormDefaults);
  const [taskForm, setTaskForm] = useState(taskFormDefaults);
  const [projectWorkspaceForm, setProjectWorkspaceForm] = useState(projectWorkspaceDefaults);
  const [isProjectWorkspaceEditing, setIsProjectWorkspaceEditing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [taskWorkspaceForm, setTaskWorkspaceForm] = useState(taskWorkspaceDefaults);
  const [myViewFilter, setMyViewFilter] = useState<"all-related" | "my-projects" | "my-tasks">("all-related");
  const [projectSearch, setProjectSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const adminOptions = useMemo(() => {
    const unique = new Map<string, SessionUser>();
    projectAdmins.forEach((admin) => unique.set(admin.email.toLowerCase(), admin));
    if (currentUser && (currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN")) {
      unique.set(currentUser.email.toLowerCase(), currentUser);
    }
    return Array.from(unique.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [currentUser, projectAdmins]);

  const myProjects = useMemo(() => {
    if (mode !== "my" || !currentUser) return projects;
    const email = currentUser.email.trim().toLowerCase();
    const name = currentUser.name.trim().toLowerCase();
    return projects.filter((project) => {
      const ownsProject = (project.assignedAdminEmail ?? "").trim().toLowerCase() === email || (project.assignedAdminName ?? "").trim().toLowerCase() === name;
      const hasTask = project.tasks.some((task) => (task.assigneeEmail ?? "").trim().toLowerCase() === email || (task.assignee ?? "").trim().toLowerCase() === name);
      if (myViewFilter === "my-projects") return ownsProject;
      if (myViewFilter === "my-tasks") return hasTask;
      return ownsProject || hasTask;
    });
  }, [currentUser, mode, myViewFilter, projects]);
  const viewProjects = mode === "my" ? myProjects : projects;
  const blockedProject = viewProjects.find((project) => project.tasks.some((task) => task.status === "blocked"));
  const featuredProject = viewProjects.find((project) => project.id === selectedProjectId);
  const projectSearchListId = "projects-task-search-list";
  const tasks = featuredProject?.tasks ?? [];
  const kanbanColumns = useMemo(
    () =>
      laneOrder.map((lane) => ({
        ...lane,
        tasks: tasks.filter((task) => task.status === lane.status)
      })),
    [tasks]
  );
  const projectBoardColumns = useMemo(
    () =>
      projectLaneOrder.map((lane) => ({
        ...lane,
        projects: viewProjects.filter((project) => project.status === lane.status)
      })),
    [viewProjects]
  );
  const highlightedTaskId =
    focusQueue === "blocked"
      ? tasks.find((task) => task.status === "blocked")?.id
      : undefined;
  const jumpTargetId = highlightedTaskId ? `project-task-focus-${highlightedTaskId}` : "project-task-actions";
  const searchItems: GlobalSearchItem[] = viewProjects.map((project) => ({
    id: project.id,
    title: project.title,
    subtitle: [project.status, project.description].filter(Boolean).join(" • "),
    kind: "project",
    keywords: project.tasks.map((task) => [task.title, task.assignee, task.status].filter(Boolean).join(" ")).filter(Boolean)
  }));

  useEffect(() => {
    if (focusProjectId && viewProjects.some((project) => project.id === focusProjectId)) {
      setSelectedProjectId(focusProjectId);
      return;
    }

    if (focusQueue === "blocked" && blockedProject) {
      setSelectedProjectId(blockedProject.id);
    }
  }, [blockedProject, focusProjectId, focusQueue, viewProjects]);

  useEffect(() => {
    if (selectedProjectId && !viewProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId("");
    }
  }, [selectedProjectId, viewProjects]);

  useEffect(() => {
    setProjectSearch(featuredProject?.title ?? "");
  }, [featuredProject?.id, featuredProject?.title]);

  useEffect(() => {
    if (!featuredProject) {
      setProjectWorkspaceForm(projectWorkspaceDefaults);
      setIsProjectWorkspaceEditing(false);
      setExpandedTaskId("");
      setEditingTaskId("");
      setTaskWorkspaceForm(taskWorkspaceDefaults);
      return;
    }

    setProjectWorkspaceForm({
      title: featuredProject.title,
      description: featuredProject.description,
      assignedAdminEmail: featuredProject.assignedAdminEmail ?? "",
      assignedAdminName: featuredProject.assignedAdminName ?? "",
      priority: featuredProject.priority ?? "medium",
      status: featuredProject.status,
      timelineStart: featuredProject.timelineStart ?? "",
      timelineEnd: featuredProject.timelineEnd ?? ""
    });
    setIsProjectWorkspaceEditing(false);

    const nextTaskId = featuredProject.tasks[0]?.id ?? "";
    setExpandedTaskId(nextTaskId);
    setEditingTaskId("");
    if (!nextTaskId) {
      setTaskWorkspaceForm(taskWorkspaceDefaults);
      return;
    }

    const firstTask = featuredProject.tasks.find((task) => task.id === nextTaskId);
    if (firstTask) {
      setTaskWorkspaceForm({
        title: firstTask.title,
        assignee: firstTask.assignee ?? "",
        assigneeEmail: firstTask.assigneeEmail ?? "",
        dueDate: firstTask.dueDate ?? "",
        status: firstTask.status
      });
    }
  }, [featuredProject]);

  useEffect(() => {
    if (!featuredProject || !expandedTaskId) {
      setTaskWorkspaceForm(taskWorkspaceDefaults);
      return;
    }

    const selectedTask = featuredProject.tasks.find((task) => task.id === expandedTaskId);
    if (!selectedTask) {
      setTaskWorkspaceForm(taskWorkspaceDefaults);
      return;
    }

    setTaskWorkspaceForm({
      title: selectedTask.title,
      assignee: selectedTask.assignee ?? "",
      assigneeEmail: selectedTask.assigneeEmail ?? "",
      dueDate: selectedTask.dueDate ?? "",
      status: selectedTask.status
    });
  }, [featuredProject, expandedTaskId]);

  useEffect(() => {
    if (!contextMessage) return;
    const timer = window.setTimeout(() => {
      document.getElementById(jumpTargetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [contextMessage, jumpTargetId]);

  async function createProjectAction() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create project.");
      }

      setProjects((current) => [payload.item, ...current]);
      setSelectedProjectId(payload.item.id);
      setProjectForm(projectFormDefaults);
      setMessage("Project created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create project.");
    } finally {
      setIsBusy(false);
    }
  }

  async function addTaskAction() {
    if (!featuredProject) return;
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${featuredProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add task.");
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === featuredProject.id ? { ...project, tasks: [payload.item, ...project.tasks] } : project
        )
      );
      setTaskForm(taskFormDefaults);
      setMessage("Task added to project.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add task.");
    } finally {
      setIsBusy(false);
    }
  }

  async function moveTask(task: ProjectTask, status: ProjectTask["status"]) {
    if (!featuredProject || task.status === status) return;
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${featuredProject.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to move task.");
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === featuredProject.id
            ? {
                ...project,
                tasks: project.tasks.map((item) => (item.id === task.id ? { ...item, status: payload.task.status } : item))
              }
            : project
        )
      );
      setMessage(`Task moved to ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to move task.");
    } finally {
      setIsBusy(false);
    }
  }

  function jumpToSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function saveProjectWorkspaceAction() {
    if (!featuredProject) return;
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${featuredProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectWorkspaceForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update project.");
      }

      setProjects((current) =>
        current.map((project) => (project.id === featuredProject.id ? { ...project, ...payload.item } : project))
      );
      setIsProjectWorkspaceEditing(false);
      setMessage("Project updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update project.");
    } finally {
      setIsBusy(false);
    }
  }

  function resetProjectWorkspaceForm() {
    if (!featuredProject) {
      setProjectWorkspaceForm(projectWorkspaceDefaults);
      return;
    }

    setProjectWorkspaceForm({
      title: featuredProject.title,
      description: featuredProject.description,
      assignedAdminEmail: featuredProject.assignedAdminEmail ?? "",
      assignedAdminName: featuredProject.assignedAdminName ?? "",
      priority: featuredProject.priority ?? "medium",
      status: featuredProject.status,
      timelineStart: featuredProject.timelineStart ?? "",
      timelineEnd: featuredProject.timelineEnd ?? ""
    });
  }

  function startTaskEditing(task: ProjectTask) {
    setExpandedTaskId(task.id);
    setEditingTaskId(task.id);
    setTaskWorkspaceForm({
      title: task.title,
      assignee: task.assignee ?? "",
      assigneeEmail: task.assigneeEmail ?? "",
      dueDate: task.dueDate ?? "",
      status: task.status
    });
  }

  function cancelTaskEditing(task: ProjectTask) {
    setEditingTaskId("");
    setTaskWorkspaceForm({
      title: task.title,
      assignee: task.assignee ?? "",
      assigneeEmail: task.assigneeEmail ?? "",
      dueDate: task.dueDate ?? "",
      status: task.status
    });
  }

  async function saveTaskWorkspaceAction(taskId: string) {
    if (!featuredProject || !taskId) return;
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${featuredProject.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskWorkspaceForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update task.");
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === featuredProject.id
            ? {
                ...project,
                tasks: project.tasks.map((task) => (task.id === taskId ? payload.task : task))
              }
            : project
        )
      );
      setEditingTaskId("");
      setMessage("Task updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update task.");
    } finally {
      setIsBusy(false);
    }
  }

  function getProjectDaysOpen(project: Project) {
    const parseDate = (value?: string) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    };

    const createdFromIso = parseDate(project.createdAt);
    if (createdFromIso) {
      const diffMs = Date.now() - createdFromIso.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const match = project.projectRef?.match(/(\d{2})\/(\d{2})\/(\d{2})/);
    if (!match) return 0;
    const [, dd, mm, yy] = match;
    const parsed = new Date(Number(`20${yy}`), Number(mm) - 1, Number(dd));
    if (Number.isNaN(parsed.getTime())) return 0;
    const diffMs = Date.now() - parsed.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  function handleStatTileClick(target: "projects" | "tasks" | "stuck" | "parking") {
    if (target === "projects" && viewProjects[0]) {
      setSelectedProjectId(viewProjects[0].id);
      jumpToSection("projects-board");
      return;
    }

    if (target === "tasks") {
      jumpToSection("projects-task-intake");
      return;
    }

    if (target === "stuck" && blockedProject) {
      setSelectedProjectId(blockedProject.id);
      jumpToSection("projects-board");
      return;
    }

    jumpToSection("projects-parking-linkage");
  }

  const showManagerSections = mode === "manager";
  const isMyMode = mode === "my";
  const myOpenTasks = isMyMode
    ? viewProjects.flatMap((project) => project.tasks).filter((task) => task.status !== "done").length
    : 0;
  const myOverdueTasks = isMyMode
    ? viewProjects
        .flatMap((project) => project.tasks)
        .filter((task) => task.status !== "done" && task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length
    : 0;
  const myBlockedItems = isMyMode
    ? viewProjects.filter((project) => project.status === "blocked").length +
      viewProjects.flatMap((project) => project.tasks).filter((task) => task.status === "blocked").length
    : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <div className="dashboard-actions">
          {isMyMode ? (
            <select
              value={myViewFilter}
              onChange={(event) => setMyViewFilter(event.target.value as typeof myViewFilter)}
              className="button-secondary"
            >
              <option value="all-related">All Related</option>
              <option value="my-projects">My Projects</option>
              <option value="my-tasks">My Tasks</option>
            </select>
          ) : null}
          <GlobalSearch
            items={searchItems}
            onItemSelect={(item) => {
              setSelectedProjectId(item.id);
              jumpToSection("projects-board");
            }}
          />
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

      <section className="dashboard-stat-grid">
        <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("projects")}>
          <span>{isMyMode ? "My Related Projects" : "Active Projects"}</span>
          <strong>{viewProjects.length}</strong>
          <small>{isMyMode ? "Projects you own or contribute to" : "Live collaborative initiatives"}</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("tasks")}>
          <span>{isMyMode ? "My Open Tasks" : "Open Tasks"}</span>
          <strong>{isMyMode ? myOpenTasks : tasks.length}</strong>
          <small>{isMyMode ? "Across projects linked to you" : "Across the current project"}</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("stuck")}>
          <span>{isMyMode ? "Blocked Items" : "Stuck"}</span>
          <strong>{isMyMode ? myBlockedItems : tasks.filter((task) => task.status === "blocked").length}</strong>
          <small>{isMyMode ? "Blocked projects + blocked tasks" : "Needs support and follow-up"}</small>
        </button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => handleStatTileClick("parking")}>
          <span>{isMyMode ? "Overdue Tasks" : "Parking Lot Ready"}</span>
          <strong>{isMyMode ? myOverdueTasks : parkingLotIdeas.length}</strong>
          <small>{isMyMode ? "Tasks past due date" : "Ideas waiting for action"}</small>
        </button>
      </section>

      {showManagerSections ? (
      <section className="dashboard-feature-grid">
        <article id="projects-board" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Projects Board</h2>
              <p>Visual status board for all projects by lifecycle stage.</p>
            </div>
            <span className="status-chip status-chip-success">{projects.length} total</span>
          </div>

          <div className="projects-kanban-grid">
            {projectBoardColumns.map((column) => (
              <article key={column.status} className={`projects-kanban-column projects-kanban-column-${column.status}`}>
                <div className="panel-head">
                  <strong className="projects-kanban-column-title">{column.title}</strong>
                  <span className={`status-chip projects-lane-chip projects-lane-chip-${column.status}`}>{column.projects.length}</span>
                </div>
                <div className="dashboard-stack">
                  {column.projects.map((project) => (
                    <article
                      key={project.id}
                      className={`projects-task-card projects-task-card-${column.status}${project.id === featuredProject?.id ? " dashboard-context-highlight" : ""}`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.title}</strong>
                    </article>
                  ))}
                  {column.projects.length === 0 ? (
                    <article className="dashboard-today-card">
                      <strong>No projects</strong>
                    </article>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article id="project-task-board" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Tasks Board</h2>
              <p>{featuredProject?.title ?? "Select a project"} tasks grouped by status.</p>
            </div>
            <span className="status-chip status-chip-success">{tasks.length} task(s)</span>
          </div>

          <div className="projects-kanban-grid">
            {kanbanColumns.map((column) => (
              <article key={column.title} className={`projects-kanban-column projects-kanban-column-${column.status}`}>
                <div className="panel-head">
                  <strong className="projects-kanban-column-title">{column.title}</strong>
                  <span className={`status-chip projects-lane-chip projects-lane-chip-${column.status}`}>{column.tasks.length}</span>
                </div>
                <div className="dashboard-stack">
                  {column.tasks.map((task) => (
                    <article
                      key={task.id}
                      id={`project-task-focus-${task.id}`}
                      className={`projects-task-card projects-task-card-${column.status}${highlightedTaskId === task.id ? " dashboard-context-highlight" : ""}`}
                    >
                      <strong>{task.title}</strong>
                    </article>
                  ))}
                  {column.tasks.length === 0 ? (
                    <article className="dashboard-today-card">
                      <strong>No tasks</strong>
                    </article>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
      ) : null}

      {showManagerSections ? (
      <section className="dashboard-feature-grid">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Project Intake</h2>
              <p>Keep project setup lightweight so the team can capture an initiative quickly and start moving tasks.</p>
            </div>
            <span className="status-chip status-chip-success">Live Form</span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Project Name</span>
              <input value={projectForm.title} onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Assigned Admin</span>
              <select
                value={projectForm.assignedAdminEmail}
                onChange={(event) => {
                  const selectedEmail = event.target.value;
                  const selectedAdmin = adminOptions.find((admin) => admin.email === selectedEmail);
                  setProjectForm((current) => ({
                    ...current,
                    assignedAdminEmail: selectedEmail,
                    assignedAdminName: selectedAdmin?.name ?? ""
                  }));
                }}
              >
                <option value="">Select admin</option>
                {adminOptions.map((admin) => (
                  <option key={admin.email} value={admin.email}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Lanes</span>
              <select
                value={projectForm.status ?? "planned"}
                onChange={(event) =>
                  setProjectForm((current) => ({
                    ...current,
                    status: event.target.value as Project["status"]
                  }))
                }
              >
                {projectLaneOrder.map((lane) => (
                  <option key={lane.status} value={lane.status}>
                    {lane.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Priority</span>
              <select
                value={projectForm.priority}
                onChange={(event) =>
                  setProjectForm((current) => ({
                    ...current,
                    priority: event.target.value as NonNullable<Project["priority"]>
                  }))
                }
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="field">
              <span>Start Date</span>
              <input
                type="date"
                value={projectForm.timelineStart}
                onChange={(event) => setProjectForm((current) => ({ ...current, timelineStart: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Targeted End Date</span>
              <input
                type="date"
                value={projectForm.timelineEnd}
                onChange={(event) => setProjectForm((current) => ({ ...current, timelineEnd: event.target.value }))}
              />
            </label>
            <label className="field field-wide">
              <span>Description</span>
              <textarea value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
            </label>
          </div>

          <div className="dashboard-actions-row project-intake-save-row">
            <button
              className="button-primary"
              type="button"
              onClick={createProjectAction}
              disabled={isBusy || !projectForm.title.trim()}
            >
              {isBusy ? "Saving..." : "Save Project"}
            </button>
          </div>

          <div className="dashboard-actions-row">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`faults-selection-pill${project.id === featuredProject?.id ? " faults-selection-pill-active" : ""}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                {project.title}
              </button>
            ))}
          </div>
        </article>
        <article id="projects-task-intake" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Task Intake</h2>
              <p>Add tasks directly into the selected project so the Kanban board stays current without admin overhead.</p>
            </div>
            <span className="status-chip status-chip-warning">Task Flow</span>
          </div>

          <div className="meta-row">
            <span className="tag">
              Selected Project: {featuredProject?.title ?? "Save a project first"}
            </span>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>Project Search</span>
              <input
                list={projectSearchListId}
                value={projectSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setProjectSearch(nextValue);
                  const matched = projects.find((project) => project.title.toLowerCase() === nextValue.trim().toLowerCase());
                  if (matched) {
                    setSelectedProjectId(matched.id);
                  }
                }}
                placeholder="Search and select a project"
              />
              <datalist id={projectSearchListId}>
                {projects.map((project) => (
                  <option key={project.id} value={project.title} />
                ))}
              </datalist>
            </label>
            <label className="field field-wide">
              <span>Task Title</span>
              <input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Owner</span>
              <select
                value={taskForm.assigneeEmail}
                onChange={(event) => {
                  const selectedEmail = event.target.value;
                  const selectedAdmin = adminOptions.find((admin) => admin.email === selectedEmail);
                  setTaskForm((current) => ({
                    ...current,
                    assigneeEmail: selectedEmail,
                    assignee: selectedAdmin?.name ?? ""
                  }));
                }}
              >
                <option value="">Select admin</option>
                {adminOptions.map((admin) => (
                  <option key={admin.email} value={admin.email}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-wide">
              <span>Due Date</span>
              <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label className="field field-wide">
              <span>Lane</span>
              <select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as ProjectTask["status"] }))}>
                {laneOrder.map((lane) => (
                  <option key={lane.status} value={lane.status}>
                    {lane.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="dashboard-actions-row task-intake-save-row">
            <button
              className="button-primary"
              type="button"
              onClick={addTaskAction}
              disabled={isBusy || !featuredProject || !taskForm.title.trim()}
            >
              {isBusy ? "Saving..." : "Save Task"}
            </button>
          </div>
        </article>
      </section>
      ) : null}

      <section className="dashboard-feature-grid fault-queue-fullwidth">
        <article className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Project Queue</h2>
              <p>Click a project to load it into Task Intake and the board.</p>
            </div>
            <span className="status-chip status-chip-default">{viewProjects.length} project(s)</span>
          </div>

          {viewProjects.length === 0 ? (
            <article className="dashboard-today-card">
              <strong>No projects yet.</strong>
              <p>{isMyMode ? "No related projects found for your current filter." : "Save a project in Project Intake to populate this queue."}</p>
            </article>
          ) : (
            <div className="fault-queue-table-wrap">
              <table className="fault-queue-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Selected Admin</th>
                    <th>Lanes</th>
                    <th>Priority</th>
                    <th>Start Date</th>
                    <th>Targeted End Date</th>
                    <th>Days Open</th>
                  </tr>
                </thead>
                <tbody>
                  {viewProjects.map((project) => {
                    const selected = project.id === featuredProject?.id;
                    return (
                      <tr
                        key={project.id}
                        className={`fault-queue-row ${selected ? "fault-queue-row-selected" : ""}`}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          jumpToSection("projects-workspace");
                        }}
                      >
                        <td className="fault-queue-title-cell">
                          <span className={`status-chip projects-lane-chip projects-lane-chip-${project.status}`}>{project.title}</span>
                        </td>
                        <td>{project.assignedAdminName ?? "Not assigned"}</td>
                        <td>
                          <span className={`status-chip status-chip-${project.status}`}>{project.status}</span>
                        </td>
                        <td>
                          <span
                            className={`status-chip ${
                              project.priority === "critical"
                                ? "status-chip-danger"
                                : project.priority === "high"
                                  ? "status-chip-warning"
                                  : project.priority === "low"
                                    ? "status-chip-default"
                                    : "status-chip-success"
                            }`}
                          >
                            {project.priority ?? "medium"}
                          </span>
                        </td>
                        <td>{project.timelineStart ?? "Not set"}</td>
                        <td>{project.timelineEnd ?? "Not set"}</td>
                        <td>{getProjectDaysOpen(project)} day(s)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {featuredProject ? (
        <section id="projects-workspace" className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Project Workspace</h2>
                <p>Project details for {featuredProject.title}. Click Edit to make changes.</p>
              </div>
              <span className={`status-chip ${isProjectWorkspaceEditing ? "status-chip-warning" : "status-chip-default"}`}>
                {isProjectWorkspaceEditing ? "Editing" : "View Only"}
              </span>
            </div>

            <div className="form-grid">
              <label className="field field-wide">
                <span>Project Name</span>
                <input
                  value={projectWorkspaceForm.title}
                  onChange={(event) => setProjectWorkspaceForm((current) => ({ ...current, title: event.target.value }))}
                  disabled={!isProjectWorkspaceEditing}
                />
              </label>
              <label className="field field-wide">
                <span>Selected Admin</span>
                <select
                  value={projectWorkspaceForm.assignedAdminEmail}
                  disabled={!isProjectWorkspaceEditing}
                  onChange={(event) => {
                    const selectedEmail = event.target.value;
                    const selectedAdmin = adminOptions.find((admin) => admin.email === selectedEmail);
                    setProjectWorkspaceForm((current) => ({
                      ...current,
                      assignedAdminEmail: selectedEmail,
                      assignedAdminName: selectedAdmin?.name ?? ""
                    }));
                  }}
                >
                  <option value="">Select admin</option>
                  {adminOptions.map((admin) => (
                    <option key={admin.email} value={admin.email}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-wide">
                <span>Lanes</span>
                <select
                  value={projectWorkspaceForm.status}
                  disabled={!isProjectWorkspaceEditing}
                  onChange={(event) =>
                    setProjectWorkspaceForm((current) => ({
                      ...current,
                      status: event.target.value as Project["status"]
                    }))
                  }
                >
                  {projectLaneOrder.map((lane) => (
                    <option key={lane.status} value={lane.status}>
                      {lane.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-wide">
                <span>Priority</span>
                <select
                  value={projectWorkspaceForm.priority}
                  disabled={!isProjectWorkspaceEditing}
                  onChange={(event) =>
                    setProjectWorkspaceForm((current) => ({
                      ...current,
                      priority: event.target.value as NonNullable<Project["priority"]>
                    }))
                  }
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="field">
                <span>Start Date</span>
                <input
                  type="date"
                  value={projectWorkspaceForm.timelineStart}
                  onChange={(event) => setProjectWorkspaceForm((current) => ({ ...current, timelineStart: event.target.value }))}
                  disabled={!isProjectWorkspaceEditing}
                />
              </label>
              <label className="field">
                <span>Targeted End Date</span>
                <input
                  type="date"
                  value={projectWorkspaceForm.timelineEnd}
                  onChange={(event) => setProjectWorkspaceForm((current) => ({ ...current, timelineEnd: event.target.value }))}
                  disabled={!isProjectWorkspaceEditing}
                />
              </label>
              <label className="field field-wide">
                <span>Description</span>
                <textarea
                  value={projectWorkspaceForm.description}
                  onChange={(event) => setProjectWorkspaceForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  disabled={!isProjectWorkspaceEditing}
                />
              </label>
            </div>

            <div className="dashboard-actions-row project-intake-save-row">
              {isProjectWorkspaceEditing ? (
                <>
                  <button className="button-primary" type="button" onClick={saveProjectWorkspaceAction} disabled={isBusy || !projectWorkspaceForm.title.trim()}>
                    {isBusy ? "Saving..." : "Save Project Changes"}
                  </button>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      resetProjectWorkspaceForm();
                      setIsProjectWorkspaceEditing(false);
                    }}
                    disabled={isBusy}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button className="button-secondary" type="button" onClick={() => setIsProjectWorkspaceEditing(true)}>
                  Edit Project
                </button>
              )}
            </div>
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header">
              <div>
                <h2>Task Workspace</h2>
                <p>Edit tasks linked to {featuredProject.title}.</p>
              </div>
              <span className="status-chip status-chip-warning">{featuredProject.tasks.length} task(s)</span>
            </div>

            {featuredProject.tasks.length === 0 ? (
              <article className="dashboard-today-card">
                <strong>No tasks yet.</strong>
                <p>Add tasks from Task Intake, then edit them here.</p>
              </article>
            ) : (
              <div className="dashboard-stack">
                {featuredProject.tasks.map((task) => {
                  const isExpanded = expandedTaskId === task.id;
                  const isEditing = editingTaskId === task.id;
                  return (
                    <article key={task.id} className={`dashboard-approval-card ${isExpanded ? "dashboard-context-highlight" : ""}`}>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          setExpandedTaskId(task.id);
                          if (editingTaskId && editingTaskId !== task.id) {
                            setEditingTaskId("");
                          }
                        }}
                      >
                        {task.title}
                      </button>

                      {isExpanded ? (
                        <div className="form-grid form-grid-spaced">
                          <label className="field field-wide">
                            <span>Task Title</span>
                            <input
                              value={taskWorkspaceForm.title}
                              onChange={(event) => setTaskWorkspaceForm((current) => ({ ...current, title: event.target.value }))}
                              disabled={!isEditing}
                            />
                          </label>
                          <label className="field field-wide">
                            <span>Owner</span>
                            <select
                              value={taskWorkspaceForm.assigneeEmail}
                              onChange={(event) => {
                                const selectedEmail = event.target.value;
                                const selectedAdmin = adminOptions.find((admin) => admin.email === selectedEmail);
                                setTaskWorkspaceForm((current) => ({
                                  ...current,
                                  assigneeEmail: selectedEmail,
                                  assignee: selectedAdmin?.name ?? ""
                                }));
                              }}
                              disabled={!isEditing}
                            >
                              <option value="">Select admin</option>
                              {adminOptions.map((admin) => (
                                <option key={admin.email} value={admin.email}>
                                  {admin.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field field-wide">
                            <span>Due Date</span>
                            <input
                              type="date"
                              value={taskWorkspaceForm.dueDate}
                              onChange={(event) => setTaskWorkspaceForm((current) => ({ ...current, dueDate: event.target.value }))}
                              disabled={!isEditing}
                            />
                          </label>
                          <label className="field field-wide">
                            <span>Lane</span>
                            <select
                              value={taskWorkspaceForm.status}
                              onChange={(event) => setTaskWorkspaceForm((current) => ({ ...current, status: event.target.value as ProjectTask["status"] }))}
                              disabled={!isEditing}
                            >
                              {laneOrder.map((lane) => (
                                <option key={lane.status} value={lane.status}>
                                  {lane.title}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="dashboard-actions-row task-intake-save-row">
                            {isEditing ? (
                              <>
                                <button className="button-primary" type="button" onClick={() => saveTaskWorkspaceAction(task.id)} disabled={isBusy || !taskWorkspaceForm.title.trim()}>
                                  {isBusy ? "Saving..." : "Save Task Changes"}
                                </button>
                                <button className="button-secondary" type="button" onClick={() => cancelTaskEditing(task)} disabled={isBusy}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button className="button-secondary" type="button" onClick={() => startTaskEditing(task)}>
                                Edit Task
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {showManagerSections ? (
      <section className="dashboard-feature-grid">
        <article id="projects-parking-linkage" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Parking Lot Linkage</h2>
              <p>Ideas stay visible here until they become projects, resolutions, or stay parked for later.</p>
            </div>
            <span className="status-chip status-chip-default">Idea Flow</span>
          </div>

          <div className="dashboard-stack">
            {parkingLotIdeas.slice(0, 3).map((idea) => (
              <article key={idea.id} className="dashboard-approval-card">
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
      ) : null}
    </>
  );
}
