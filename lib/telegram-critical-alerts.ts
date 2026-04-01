import { readFaultsStore } from "@/lib/fault-store";
import { addAdminNotifications } from "@/lib/notification-store";
import { readPRCommsStore } from "@/lib/pr-comms-store";
import { readProEventCampaignStore } from "@/lib/pro-events-store";
import { markTelegramAlertQueuedOnce } from "@/lib/telegram-alert-log";
import type { Fault, Project, ProjectTask, ProjectStatus } from "@/types/domain";

function getBaseUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3010";
}

function buildActionUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, getBaseUrl());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function queueCriticalTelegramAlert(input: {
  key: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const shouldSend = await markTelegramAlertQueuedOnce(input.key);
  if (!shouldSend) {
    return;
  }

  await addAdminNotifications([
    {
      id: `tg-critical-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      detail: `${input.message}\n${input.actionLabel}: ${input.actionUrl}`,
      channel: "telegram",
      audience: "admins",
      createdAt: new Date().toISOString(),
      importance: "critical",
      tone: "danger"
    }
  ]);
}

function normalizeText(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function toAgeDays(anchorIso?: string) {
  if (!anchorIso) return 0;
  const ageMs = Date.now() - new Date(anchorIso).getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

function getFaultOpenAnchor(fault: Fault) {
  return fault.escalatedAt ?? fault.createdAt ?? fault.updatedAt ?? new Date().toISOString();
}

function canEscalate(fault: Fault, level: "plus" | "plusplus") {
  const ageDays = toAgeDays(getFaultOpenAnchor(fault));
  if (fault.priority === "critical") {
    return true;
  }
  if (fault.priority === "high") {
    return level === "plus" ? true : ageDays >= 2;
  }
  return level === "plus" ? ageDays >= 4 : ageDays >= 7;
}

function getSlaDays(priority: Fault["priority"]) {
  if (priority === "critical") return 1;
  if (priority === "high") return 2;
  if (priority === "medium") return 4;
  return 7;
}

function isOpenFault(fault: Fault) {
  return fault.status === "escalated" || fault.status === "in-progress";
}

export async function queueFaultCreatedTelegramAlerts(fault: Fault, duplicateOpenCount: number) {
  const queueHref = buildActionUrl("/dashboard/faults/register", { focus: fault.id });

  if (fault.priority === "critical") {
    await queueCriticalTelegramAlert({
      key: `fault-critical-created-${fault.id}`,
      title: "Critical Fault Logged",
      message: `Critical fault ${fault.ethekwiniReference ?? fault.id} was logged at ${fault.locationText}. Assigned to ${fault.assignedAdminName ?? "Unassigned"} right now.`,
      actionLabel: "Open Fault Queue",
      actionUrl: queueHref
    });
  }

  if (duplicateOpenCount > 0) {
    await queueCriticalTelegramAlert({
      key: `fault-duplicate-${fault.id}`,
      title: "Possible Duplicate Fault",
      message: `Possible duplicate detected for ${fault.category}${fault.subCategory ? ` > ${fault.subCategory}` : ""} at ${fault.locationText}. ${duplicateOpenCount} similar open fault(s) already exist.`,
      actionLabel: "Review Duplicates",
      actionUrl: queueHref
    });
  }
}

export async function queueProjectCriticalAlerts(input: {
  project: Project;
  previousStatus?: ProjectStatus;
  trigger: "created" | "status-blocked";
}) {
  const projectUrl = buildActionUrl("/dashboard/projects/manager", { focusProject: input.project.id });
  if (input.trigger === "created" && input.project.priority === "critical") {
    await queueCriticalTelegramAlert({
      key: `project-critical-created-${input.project.id}`,
      title: "Critical Project Loaded",
      message: `Project "${input.project.title}" is marked Critical and needs immediate execution tracking.`,
      actionLabel: "Open Project Manager",
      actionUrl: projectUrl
    });
  }

  if (input.trigger === "status-blocked") {
    await queueCriticalTelegramAlert({
      key: `project-blocked-${input.project.id}-${input.project.updatedAt ?? Date.now()}`,
      title: "Project Blocked",
      message: `Project "${input.project.title}" moved from ${input.previousStatus ?? "unknown"} to BLOCKED and needs intervention.`,
      actionLabel: "Unblock Project",
      actionUrl: projectUrl
    });
  }
}

export async function queueTaskCriticalAlerts(input: {
  project: Project;
  task: ProjectTask;
  previousStatus: ProjectTask["status"];
}) {
  const taskUrl = buildActionUrl("/dashboard/projects/manager", {
    focusProject: input.project.id,
    focusTask: input.task.id
  });
  await queueCriticalTelegramAlert({
    key: `task-blocked-${input.project.id}-${input.task.id}-${input.task.updatedAt ?? Date.now()}`,
    title: "Task Blocked",
    message: `Task "${input.task.title}" in project "${input.project.title}" moved from ${input.previousStatus} to BLOCKED and needs support.`,
    actionLabel: "Open Task Workspace",
    actionUrl: taskUrl
  });
}

export async function queueFaultReopenedTelegramAlert(fault: Fault, reopenReason?: string) {
  await queueCriticalTelegramAlert({
    key: `fault-reopened-${fault.id}-${fault.reopenCount ?? 1}`,
    title: "Fault Reopened",
    message: `Fault ${fault.ethekwiniReference ?? fault.id} was reopened. Reason: ${reopenReason?.trim() || "Not provided"}.`,
    actionLabel: "Resume Fault",
    actionUrl: buildActionUrl("/dashboard/faults/register", { focus: fault.id })
  });
}

export async function queueConnectorFailureTelegramAlert(scope: "mailbox" | "calendar", reason: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  await queueCriticalTelegramAlert({
    key: `connector-failure-${scope}-${dateKey}-${normalizeText(reason).slice(0, 80)}`,
    title: `${scope === "mailbox" ? "Mailbox" : "Calendar"} Connector Failure`,
    message: `${scope === "mailbox" ? "Hello Inbox" : "Shared calendar"} connector failed: ${reason}`,
    actionLabel: "Open Settings",
    actionUrl: buildActionUrl("/dashboard/super-admin")
  });
}

export async function runTelegramCriticalAlertSweep() {
  const faults = readFaultsStore();
  const openFaults = faults.filter(isOpenFault);

  for (const fault of openFaults) {
    const queueHref = buildActionUrl("/dashboard/faults/register", { focus: fault.id });
    const ageDays = toAgeDays(getFaultOpenAnchor(fault));
    const updatedDays = toAgeDays(fault.updatedAt ?? fault.createdAt);

    if (fault.escalationLevel === "none" && canEscalate(fault, "plus")) {
      await queueCriticalTelegramAlert({
        key: `fault-escalate-plus-due-${fault.id}`,
        title: "Escalate+ Now Due",
        message: `Fault ${fault.ethekwiniReference ?? fault.id} is due for Escalate+ based on ${fault.priority} priority and current age.`,
        actionLabel: "Escalate In Queue",
        actionUrl: queueHref
      });
    }

    if (fault.escalationLevel !== "plusplus" && canEscalate(fault, "plusplus")) {
      await queueCriticalTelegramAlert({
        key: `fault-escalate-plusplus-due-${fault.id}`,
        title: "Escalate++ Now Due",
        message: `Fault ${fault.ethekwiniReference ?? fault.id} is due for Escalate++ and should be moved to management escalation.`,
        actionLabel: "Escalate In Queue",
        actionUrl: queueHref
      });
    }

    const slaDays = getSlaDays(fault.priority);
    if (ageDays > slaDays) {
      await queueCriticalTelegramAlert({
        key: `fault-sla-breach-${fault.id}`,
        title: "Fault SLA Breach",
        message: `Fault ${fault.ethekwiniReference ?? fault.id} is ${ageDays} day(s) open (SLA ${slaDays} day(s)) and has breached SLA.`,
        actionLabel: "Open Breached Fault",
        actionUrl: queueHref
      });
    }

    if (updatedDays >= 5) {
      await queueCriticalTelegramAlert({
        key: `fault-stale-${fault.id}-5d`,
        title: "Stale Fault Requires Update",
        message: `Fault ${fault.ethekwiniReference ?? fault.id} has no updates for ${updatedDays} day(s).`,
        actionLabel: "Update Fault",
        actionUrl: queueHref
      });
    }
  }

  const prComms = readPRCommsStore();
  for (const comm of prComms) {
    if (comm.status !== "pending-approval") continue;
    const createdAt = comm.createdAt ? new Date(comm.createdAt).getTime() : Number.NaN;
    if (!Number.isFinite(createdAt)) continue;
    const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (ageHours < 24 || comm.appCount >= 2) continue;

    await queueCriticalTelegramAlert({
      key: `pr-approval-stalled-${comm.id}`,
      title: "Communication Approval Bottleneck",
      message: `Communication draft "${comm.headline}" has been waiting ${Math.floor(ageHours)} hour(s) and still needs approvals.`,
      actionLabel: "Open PRO PlayGround",
      actionUrl: buildActionUrl("/dashboard/pro")
    });
  }

  const events = await readProEventCampaignStore();
  for (const item of events) {
    if (item.status !== "pending-approval") continue;
    const createdAt = new Date(item.createdAt).getTime();
    if (!Number.isFinite(createdAt)) continue;
    const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
    if (ageHours < 24 || item.appCount >= 5) continue;

    await queueCriticalTelegramAlert({
      key: `event-approval-stalled-${item.id}`,
      title: "Event Approval Bottleneck",
      message: `Event/Campaign "${item.name}" has been waiting ${Math.floor(ageHours)} hour(s) and still needs votes to reach 5 approvals.`,
      actionLabel: "Open PRO PlayGround",
      actionUrl: buildActionUrl("/dashboard/pro")
    });
  }
}
