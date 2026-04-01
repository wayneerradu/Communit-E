import { z } from "zod";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/demo-data";
import { readFaultNotesStore, readFaultsStore, writeFaultNotesStore, writeFaultsStore } from "@/lib/fault-store";
import { readInfrastructureStore, writeInfrastructureStore } from "@/lib/infrastructure-store";
import { readMeetingMinutesStore, writeMeetingMinutesStore } from "@/lib/meeting-store";
import { renderFaultEmailTemplate } from "@/lib/fault-email-templates";
import { appendGovernanceAudit } from "@/lib/governance-audit-store";
import { addAdminNotifications } from "@/lib/notification-store";
import { readParkingLotStore, writeParkingLotStore } from "@/lib/parking-lot-store";
import { readPlatformSettings } from "@/lib/platform-store";
import { readPRCommsStore, writePRCommsStore } from "@/lib/pr-comms-store";
import { readProjectsStore, writeProjectsStore } from "@/lib/project-store";
import { readResidentHistoryStore, readResidentsStore, writeResidentHistoryStore, writeResidentsStore } from "@/lib/resident-store";
import { readResolutionsStore, writeResolutionsStore } from "@/lib/resolution-store";
import { buildFaultEscalationLookupKey } from "@/lib/fault-escalation-keys";
import {
  queueFaultCreatedTelegramAlerts,
  queueFaultReopenedTelegramAlert,
  queueProjectCriticalAlerts,
  queueTaskCriticalAlerts
} from "@/lib/telegram-critical-alerts";
import { readVaultStore, writeVaultStore } from "@/lib/vault-store";
import type { AppNotification, Fault, FaultNote, FaultStatus, InfrastructureAsset, MeetingMinute, ParkingLotIdea, PRComm, Project, ProjectTask, Resident, ResidentHistoryItem, ResidentStatus, ResidentType, Resolution, SessionUser, VaultAsset } from "@/types/domain";

const faultCreateSchema = z.object({
  title: z.string().min(3),
  ethekwiniReference: z.string().trim().min(1, "eThekwini Fault Reference is required."),
  description: z.string().min(10),
  reporterEmail: z.string().email(),
  category: z.string().min(3),
  subCategory: z.string().min(3).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  locationText: z.string().min(3),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mediaRefs: z.array(z.string().min(1)).max(4).optional(),
  municipalityEmail: z.string().email().optional(),
  residentId: z.string().optional()
});

const faultStatusSchema = z.object({
  status: z.enum(["escalated", "in-progress", "closed", "archived"])
});

const faultNoteSchema = z.object({
  body: z.string().min(3),
  authorName: z.string().min(2).optional(),
  includeInEmail: z.boolean().optional(),
  visibility: z.enum(["internal", "public-safe"]).optional()
});

const faultUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  ethekwiniReference: z.string().trim().min(1).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(3).optional(),
  subCategory: z.string().min(2).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  locationText: z.string().min(3).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  mediaRefs: z.array(z.string().min(1)).max(4).optional(),
  residentId: z.string().optional(),
  assignedToEmail: z.string().email().optional(),
  assignedAdminName: z.string().min(2).optional(),
  expectedUpdatedAt: z.string().optional(),
  note: z.string().min(3).optional()
});

const residentCreateSchema = z.object({
  name: z.string().min(3),
  standNo: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().regex(/^\+27\d{9}$/, "Mobile number must use the +27 format."),
  residentType: z.enum(["resident", "admin", "street-captain", "volunteer", "animal-care-volunteer"]).optional(),
  securityCompany: z.string().min(2),
  addressLine1: z.string().min(3),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional().or(z.literal(""))
});

const residentStatusSchema = z.object({
  status: z.enum(["pending", "active", "archived", "rejected"]),
  reason: z.string().optional().or(z.literal(""))
});

const residentUpdateSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().regex(/^\+27\d{9}$/, "Mobile number must use the +27 format.").optional(),
  residentType: z.enum(["resident", "admin", "street-captain", "volunteer", "animal-care-volunteer"]).optional(),
  securityCompany: z.string().min(2).optional(),
  addressLine1: z.string().min(3).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional().or(z.literal("")),
  addressVerified: z.boolean().optional(),
  mobileVerified: z.boolean().optional(),
  whatsappAdded: z.boolean().optional(),
  consentAccepted: z.boolean().optional(),
  submittedViaPublicForm: z.boolean().optional(),
  workflowNote: z.string().optional().or(z.literal(""))
});

const projectCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  assignedAdminEmail: z.string().email().optional().or(z.literal("")),
  assignedAdminName: z.string().min(2).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["planned", "active", "blocked", "completed", "archived"]).optional(),
  timelineStart: z.string().optional().or(z.literal("")),
  timelineEnd: z.string().optional().or(z.literal(""))
});

const projectTaskCreateSchema = z.object({
  title: z.string().min(3),
  assignee: z.string().optional().or(z.literal("")),
  assigneeEmail: z.string().email().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["todo", "started", "in-progress", "blocked", "done"]).default("todo")
});

const projectTaskStatusSchema = z.object({
  status: z.enum(["todo", "started", "in-progress", "blocked", "done"])
});

const projectUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  assignedAdminEmail: z.string().email().optional().or(z.literal("")),
  assignedAdminName: z.string().min(2).optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["planned", "active", "blocked", "completed", "archived"]).optional(),
  timelineStart: z.string().optional().or(z.literal("")),
  timelineEnd: z.string().optional().or(z.literal(""))
});

const projectTaskUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  assignee: z.string().optional().or(z.literal("")),
  assigneeEmail: z.string().email().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["todo", "started", "in-progress", "blocked", "done"]).optional()
});

const parkingLotCreateSchema = z.object({
  title: z.string().min(3),
  justification: z.string().min(3),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  threshold: z.number().int().positive().default(10)
});

const prCommCreateSchema = z.object({
  headline: z.string().min(3),
  body: z.string().min(10),
  channel: z.string().min(3),
  mediaRefs: z.array(z.string().min(1)).max(4).optional()
});

const vaultAssetCreateSchema = z.object({
  assetName: z.string().min(3),
  category: z.string().min(2),
  description: z.string().min(3),
  filePath: z.string().optional(),
  visibility: z.enum(["all", "admin", "pro"]).optional()
});

const meetingCreateSchema = z.object({
  title: z.string().min(3),
  meetingAt: z.string().min(8),
  attendees: z.string().min(3),
  notes: z.string().min(10)
});

const meetingScheduleSchema = z.object({
  title: z.string().min(3),
  meetingType: z.enum(["operations", "residents", "emergency", "project", "committee", "other"]),
  agenda: z.string().min(10),
  location: z.string().min(3),
  meetingDate: z.string().min(8),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  requiredAttendees: z.array(z.string().email()).min(1),
  optionalAttendees: z.array(z.string().email()).default([]),
  sendInvites: z.boolean().default(true)
});

const resolutionCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(["yes-no", "multi-option"]),
  deadlineAt: z.string().min(8),
  options: z.array(z.string().min(1)).min(2).max(4)
});

const infrastructureAssetCreateSchema = z.object({
  assetName: z.string().min(3),
  assetType: z.enum([
    "streetlight-pole",
    "optic-fiber-pole",
    "electrical-substation",
    "electrical-distribution-box",
    "water-meter",
    "water-valve",
    "fire-hydrant",
    "traffic-light",
    "manhole"
  ]),
  condition: z.string().min(3),
  street: z.string().min(3),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  notes: z.string().optional().or(z.literal("")),
  photos: z.array(z.string().min(1)).max(1).optional()
});

const infrastructureAssetUpdateSchema = z.object({
  condition: z.string().min(3).optional(),
  notes: z.string().min(3).optional()
});

export type CreateFaultInput = z.infer<typeof faultCreateSchema>;
export type CreateResidentInput = z.infer<typeof residentCreateSchema>;
export type CreateProjectInput = z.infer<typeof projectCreateSchema>;
export type CreatePRCommInput = z.infer<typeof prCommCreateSchema>;
export type CreateParkingLotIdeaInput = z.infer<typeof parkingLotCreateSchema>;
export type CreateVaultAssetInput = z.infer<typeof vaultAssetCreateSchema>;
export type CreateMeetingInput = z.infer<typeof meetingCreateSchema>;
export type ScheduleMeetingInput = z.infer<typeof meetingScheduleSchema>;
export type CreateResolutionInput = z.infer<typeof resolutionCreateSchema>;
export type CreateInfrastructureAssetInput = z.infer<typeof infrastructureAssetCreateSchema>;

type ResidentActor = Pick<SessionUser, "name" | "email" | "role">;
type FaultActor = Pick<SessionUser, "name" | "email" | "role">;


function toActorDisplay(actor: FaultActor) {
  return `${actor.name} (${actor.email})`;
}

function getFaultOwnerFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const adminNicknameByFirstName: Record<string, string> = {
  sarah: "fire",
  nomasonto: "TRYME",
  bronwynne: "SQUIRREL",
  vishal: "Nibbles",
  marvin: "Ninja",
  wayne: "Expediter",
  hello: "UIC"
};

function toProjectDateStamp(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function getAdminNickname(actor?: Pick<SessionUser, "name" | "email">) {
  if (!actor) return "UIC";
  const firstName = actor.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstName && adminNicknameByFirstName[firstName]) {
    return adminNicknameByFirstName[firstName];
  }
  const local = actor.email.split("@")[0]?.toLowerCase();
  if (local && adminNicknameByFirstName[local]) {
    return adminNicknameByFirstName[local];
  }
  return "UIC";
}

function generateUniqueProjectRef(projectsList: Project[], actor?: Pick<SessionUser, "name" | "email">, createdAt = new Date()) {
  const nickname = getAdminNickname(actor);
  const baseRef = `PRJ${nickname}${toProjectDateStamp(createdAt)}`;
  const existingRefs = new Set(
    projectsList
      .map((project) => project.projectRef?.trim())
      .filter((value): value is string => Boolean(value))
  );
  if (!existingRefs.has(baseRef)) {
    return baseRef;
  }

  let counter = 2;
  while (counter < 9999) {
    const candidate = `${baseRef}-${String(counter).padStart(2, "0")}`;
    if (!existingRefs.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }

  return `${baseRef}-${Date.now().toString().slice(-4)}`;
}

function nextTaskRef(project: Project) {
  const baseRef = project.projectRef ?? `PRJUIC${toProjectDateStamp(new Date())}`;
  const existingIndexes = project.tasks
    .map((task) => task.taskRef?.split(".").pop())
    .map((suffix) => Number.parseInt(suffix ?? "", 10))
    .filter((value) => Number.isFinite(value));
  const nextIndex = (existingIndexes.length > 0 ? Math.max(...existingIndexes) : 0) + 1;
  return `${baseRef}.${String(nextIndex).padStart(4, "0")}`;
}

function ensureProjectReferences(projectsList: Project[], project: Project) {
  const nowIso = new Date().toISOString();
  if (!project.createdAt) {
    project.createdAt = nowIso;
  }
  if (!project.updatedAt) {
    project.updatedAt = project.createdAt;
  }
  if (!project.projectRef) {
    project.projectRef = generateUniqueProjectRef(
      projectsList,
      project.assignedAdminName || project.assignedAdminEmail
        ? {
            name: project.assignedAdminName ?? project.assignedAdminEmail ?? currentUser.name,
            email: project.assignedAdminEmail ?? currentUser.email
          }
        : currentUser
    );
  }

  project.tasks.forEach((task) => {
    if (!task.createdAt) {
      task.createdAt = project.createdAt;
    }
    if (!task.updatedAt) {
      task.updatedAt = task.createdAt;
    }
    if (!task.taskRef) {
      task.taskRef = nextTaskRef(project);
    }
  });
}

function getEscalationAnchor(fault: Fault) {
  return fault.escalatedAt ?? fault.createdAt ?? new Date().toISOString();
}

function elapsedDaysSince(anchorIso: string, nowIso: string) {
  return (new Date(nowIso).getTime() - new Date(anchorIso).getTime()) / (1000 * 60 * 60 * 24);
}

function escalateThresholdDays(priority: Fault["priority"]) {
  if (priority === "critical") {
    return { plus: 0, plusplus: 0 };
  }
  if (priority === "high") {
    return { plus: 0, plusplus: 2 };
  }
  return { plus: 4, plusplus: 7 };
}

const REASSIGNMENT_COOLDOWN_MS = 120 * 1000;
const ESCALATION_IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

function getEscalationDispatchKey(stage: "initial" | "plus" | "plusplus" | "reopened") {
  return stage;
}

function isEscalationDuplicateWithinWindow(
  fault: Fault,
  stage: "plus" | "plusplus",
  nowIso: string
) {
  const nowMs = new Date(nowIso).getTime();
  const dispatchAt = fault.workflowDispatch?.[getEscalationDispatchKey(stage)];
  if (dispatchAt) {
    const delta = nowMs - new Date(dispatchAt).getTime();
    if (Number.isFinite(delta) && delta >= 0 && delta < ESCALATION_IDEMPOTENCY_WINDOW_MS) {
      return true;
    }
  }
  return false;
}

export function canEscalateFaultLevel(
  fault: Fault,
  level: "plus" | "plusplus",
  nowIso = new Date().toISOString()
) {
  const thresholds = escalateThresholdDays(fault.priority);
  const anchor = getEscalationAnchor(fault);
  const ageDays = elapsedDaysSince(anchor, nowIso);
  return level === "plus" ? ageDays >= thresholds.plus : ageDays >= thresholds.plusplus;
}

function pushFaultAuditNote(
  faultId: string,
  actor: FaultActor,
  body: string,
  source: FaultNote["source"] = "system",
  visibility: FaultNote["visibility"] = "internal"
) {
  const faultNotes = readFaultNotesStore();
  faultNotes.unshift({
    id: `fault-note-${faultNotes.length + 1}`,
    faultId,
    body,
    createdAt: new Date().toISOString(),
    authorName: actor.name,
    source,
    visibility
  });
  writeFaultNotesStore(faultNotes);
}

function ensureConcurrency(fault: Fault, expectedUpdatedAt?: string) {
  if (!expectedUpdatedAt || !fault.updatedAt) return;
  if (fault.updatedAt !== expectedUpdatedAt) {
    throw new Error("This fault was updated by another admin. Refresh and try again.");
  }
}

function normalizeResidentComparison(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeTargetEmails(emails: Array<string | undefined>) {
  return Array.from(
    new Set(
      emails
        .map((email) => email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );
}

function queueContextualAdminNotification(input: {
  title: string;
  detail: string;
  targetEmails: Array<string | undefined>;
  tone?: AppNotification["tone"];
  importance?: AppNotification["importance"];
}) {
  const targets = normalizeTargetEmails(input.targetEmails);
  if (targets.length === 0) return;

  void addAdminNotifications([
    {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      detail: input.detail,
      channel: "in-app",
      audience: "admins",
      targetEmails: targets,
      createdAt: new Date().toISOString(),
      importance: input.importance ?? "informational",
      tone: input.tone ?? "default",
      readBy: []
    }
  ]);
}

function getEscalationEmailTargets(
  settings: Awaited<ReturnType<typeof readPlatformSettings>>,
  fault: Fault,
  level: "initial" | "plus" | "plusplus"
) {
  if (level === "initial") {
    return settings.faultEscalation.initialContacts
      .filter((item) => item.active)
      .map((item) => item.email);
  }

  const subCategory = (fault.subCategory ?? "").trim();
  if (!subCategory) return [];
  const source =
    level === "plus"
      ? settings.faultEscalation.escalatePlusBySubCategory
      : settings.faultEscalation.escalatePlusPlusBySubCategory;

  const canonicalKey = buildFaultEscalationLookupKey(fault.category, fault.subCategory);
  if (canonicalKey && source[canonicalKey]?.length) {
    return source[canonicalKey].filter((item) => item.active).map((item) => item.email);
  }

  const exact = source[subCategory] ?? [];
  if (exact.length > 0) {
    return exact.filter((item) => item.active).map((item) => item.email);
  }

  const legacyComposite = `${(fault.category ?? "").trim()}::${subCategory}`;
  if (source[legacyComposite]?.length) {
    return source[legacyComposite].filter((item) => item.active).map((item) => item.email);
  }

  const lowerSub = subCategory.toLowerCase();
  const matchedKey = Object.keys(source).find((key) => key.toLowerCase() === lowerSub);
  if (!matchedKey) return [];
  return (source[matchedKey] ?? []).filter((item) => item.active).map((item) => item.email);
}

async function queueFaultWorkflowEmail(input: {
  fault: Fault;
  stage: "initial" | "plus" | "plusplus" | "reopened";
  actorName?: string;
  actorEmail?: string;
  reopenReason?: string;
}) {
  const settings = await readPlatformSettings();
  const recipients =
    input.stage === "initial"
      ? getEscalationEmailTargets(settings, input.fault, "initial")
      : input.stage === "plus"
        ? getEscalationEmailTargets(settings, input.fault, "plus")
        : input.stage === "plusplus"
          ? getEscalationEmailTargets(settings, input.fault, "plusplus")
          : getEscalationEmailTargets(settings, input.fault, "initial");

  if (recipients.length === 0) {
    return;
  }

  const templateKind =
    input.stage === "initial"
      ? "faultInitialEscalation"
      : input.stage === "plus"
        ? "faultEscalatePlus"
        : input.stage === "plusplus"
          ? "faultEscalatePlusPlus"
          : "faultReopened";

  const rendered = renderFaultEmailTemplate({
    fault: input.fault,
    templateKind,
    settings,
    reopenReason: input.reopenReason,
    adminName: input.actorName,
    adminEmail: input.actorEmail
  });

  if (!rendered.enabled) {
    return;
  }

  const councillorRecipient =
    settings.communicationSettings.email.mode === "live" ? settings.communicationSettings.councillor.email : undefined;

  await addAdminNotifications([
    {
      id: `fault-email-${input.stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: rendered.subject,
      detail: rendered.body,
      channel: "email",
      audience: "admins",
      targetEmails: [...recipients, input.actorEmail, councillorRecipient].filter(
        (email): email is string => Boolean(email)
      ),
      createdAt: new Date().toISOString(),
      importance: input.stage === "plusplus" ? "critical" : "informational",
      tone: input.stage === "plusplus" ? "danger" : "default",
      readBy: []
    }
  ]);
}

export function listFaults() {
  return readFaultsStore();
}

export function listResidents() {
  return readResidentsStore();
}

export function listResidentHistory(residentId?: string) {
  const residentHistory = readResidentHistoryStore();
  const items = residentId ? residentHistory.filter((item) => item.residentId === residentId) : residentHistory;
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listFaultNotes(faultId?: string) {
  const notes = readFaultNotesStore();
  const items = faultId ? notes.filter((note) => note.faultId === faultId) : notes;
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createFault(input: CreateFaultInput, actor?: FaultActor): Fault {
  const faults = readFaultsStore();
  const payload = faultCreateSchema.parse(input);
  const loggedBy = actor ?? currentUser;
  const nowIso = new Date().toISOString();
  const nextFault: Fault = {
    id: `fault-${faults.length + 1}`,
    title: payload.title,
    ethekwiniReference: payload.ethekwiniReference,
    description: payload.description,
    reporterEmail: payload.reporterEmail,
    category: payload.category,
    subCategory: payload.subCategory,
    priority: payload.priority ?? "medium",
    status: "escalated",
    locationText: payload.locationText,
    latitude: payload.latitude,
    longitude: payload.longitude,
    mediaRefs: payload.mediaRefs ?? [],
    municipalityEmail: payload.municipalityEmail,
    residentId: payload.residentId,
    assignedAdminName: loggedBy.name,
    loggedByAdminName: loggedBy.name,
    loggedByAdminEmail: loggedBy.email,
    assignedToEmail: loggedBy.email,
    assignedAt: nowIso,
    lastWorkedByEmail: loggedBy.email,
    lastWorkedAt: nowIso,
    escalationLevel: "none",
    feedbackStatus: "pending",
    createdAt: nowIso,
    escalatedAt: nowIso,
    updatedAt: nowIso,
    reopenCount: 0,
    escalationCount: 1,
    statusHistory: [
      {
        status: "escalated",
        at: nowIso,
        byEmail: loggedBy.email
      }
    ],
    escalationHistory: [{ level: "internal", at: nowIso, byEmail: loggedBy.email }]
    ,
    workflowDispatch: {
      initial: nowIso
    }
  };

  faults.unshift(nextFault);
  const duplicateOpenCount = faults.filter((item) => {
    if (item.id === nextFault.id) return false;
    if (item.status === "closed" || item.status === "archived") return false;
    return normalizeResidentComparison(item.category) === normalizeResidentComparison(nextFault.category) &&
      normalizeResidentComparison(item.subCategory) === normalizeResidentComparison(nextFault.subCategory) &&
      normalizeResidentComparison(item.locationText) === normalizeResidentComparison(nextFault.locationText);
  }).length;

  pushFaultAuditNote(
    nextFault.id,
    loggedBy,
    `Fault captured by ${toActorDisplay(loggedBy)} and assigned as escalation owner. Initial escalation email queue triggered.`,
    "system"
  );
  writeFaultsStore(faults);
  appendGovernanceAudit({
    area: "faults",
    entityId: nextFault.id,
    action: "fault.created",
    actorName: loggedBy.name,
    actorEmail: loggedBy.email,
    after: {
      status: nextFault.status,
      priority: nextFault.priority,
      category: nextFault.category,
      subCategory: nextFault.subCategory ?? null,
      assignedToEmail: nextFault.assignedToEmail ?? null
    },
    detail: "Fault captured and initial escalation queued."
  });
  void queueFaultCreatedTelegramAlerts(nextFault, duplicateOpenCount);
  void queueFaultWorkflowEmail({
    fault: nextFault,
    stage: "initial",
    actorName: loggedBy.name,
    actorEmail: loggedBy.email
  });
  return nextFault;
}

export function listInfrastructureAssets() {
  return readInfrastructureStore();
}

export function createInfrastructureAsset(input: CreateInfrastructureAssetInput): InfrastructureAsset {
  const infrastructureAssets = readInfrastructureStore();
  const payload = infrastructureAssetCreateSchema.parse(input);
  const asset: InfrastructureAsset = {
    id: `asset-${infrastructureAssets.length + 1}`,
    assetName: payload.assetName,
    assetType: payload.assetType,
    condition: payload.condition,
    street: payload.street,
    latitude: payload.latitude,
    longitude: payload.longitude,
    notes: payload.notes || undefined,
    photos: payload.photos ?? []
  };

  infrastructureAssets.unshift(asset);
  writeInfrastructureStore(infrastructureAssets);
  return asset;
}

export function updateInfrastructureAsset(id: string, input: z.infer<typeof infrastructureAssetUpdateSchema>) {
  const infrastructureAssets = readInfrastructureStore();
  const payload = infrastructureAssetUpdateSchema.parse(input);
  const asset = infrastructureAssets.find((item) => item.id === id);
  if (!asset) {
    throw new Error("Asset not found");
  }

  if (payload.condition) {
    asset.condition = payload.condition;
  }
  if (payload.notes) {
    asset.notes = payload.notes;
  }

  writeInfrastructureStore(infrastructureAssets);
  return asset;
}

export function escalateFault(id: string, actor?: FaultActor) {
  return escalateFaultLevel(id, "plus", { actor });
}

export function escalateFaultLevel(
  id: string,
  level: "plus" | "plusplus",
  options?: { actor?: FaultActor; expectedUpdatedAt?: string }
) {
  const faults = readFaultsStore();
  const actingUser = options?.actor ?? currentUser;
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }

  ensureConcurrency(fault, options?.expectedUpdatedAt);

  const nowIso = new Date().toISOString();
  const beforeSnapshot = {
    escalationLevel: fault.escalationLevel ?? "none",
    status: fault.status,
    escalationCount: fault.escalationCount ?? 0
  };
  if (isEscalationDuplicateWithinWindow(fault, level, nowIso)) {
    throw new Error("Duplicate escalation prevented. Please wait before retrying.");
  }

  if (!canEscalateFaultLevel(fault, level, nowIso)) {
    throw new Error(`Escalate${level === "plusplus" ? "++" : "+"} is not due yet for this priority.`);
  }

  if (level === "plus" && (fault.escalationLevel === "plus" || fault.escalationLevel === "plusplus")) {
    throw new Error("Escalate+ already triggered for this fault.");
  }
  if (level === "plusplus" && fault.escalationLevel === "plusplus") {
    throw new Error("Escalate++ already triggered for this fault.");
  }

  if (level === "plus") {
    fault.internalEscalated = true;
    fault.escalationLevel = "plus";
    fault.workflowDispatch = {
      ...(fault.workflowDispatch ?? {}),
      plus: nowIso
    };
  }
  if (level === "plusplus") {
    fault.internalEscalated = true;
    fault.externalEscalated = true;
    fault.escalationLevel = "plusplus";
    fault.workflowDispatch = {
      ...(fault.workflowDispatch ?? {}),
      plusplus: nowIso
    };
  }
  fault.escalatedAt = fault.escalatedAt ?? nowIso;
  fault.updatedAt = nowIso;
  fault.lastWorkedByEmail = actingUser.email;
  fault.lastWorkedAt = nowIso;
  fault.escalationCount = (fault.escalationCount ?? 0) + 1;
  if (!fault.escalationHistory) {
    fault.escalationHistory = [];
  }
  fault.escalationHistory.push({
    level: level === "plus" ? "internal" : "external",
    at: nowIso,
    byEmail: actingUser.email
  });

  if (fault.status !== "escalated") {
    fault.status = "escalated";
    fault.statusHistory = fault.statusHistory ?? [];
    fault.statusHistory.push({ status: "escalated", at: nowIso, byEmail: actingUser.email });
  }
  pushFaultAuditNote(
    fault.id,
    actingUser,
    `Escalate${level === "plusplus" ? "++" : "+"} triggered by ${toActorDisplay(actingUser)} for ${fault.id}.`,
    "system"
  );
  writeFaultsStore(faults);
  appendGovernanceAudit({
    area: "faults",
    entityId: fault.id,
    action: level === "plusplus" ? "fault.escalated-plusplus" : "fault.escalated-plus",
    actorName: actingUser.name,
    actorEmail: actingUser.email,
    before: beforeSnapshot,
    after: {
      escalationLevel: fault.escalationLevel,
      status: fault.status,
      escalationCount: fault.escalationCount ?? 0
    },
    detail: `Escalate${level === "plusplus" ? "++" : "+"} executed.`
  });
  void queueFaultWorkflowEmail({
    fault,
    stage: level === "plusplus" ? "plusplus" : "plus",
    actorName: actingUser.name,
    actorEmail: actingUser.email
  });

  return {
    fault,
    notes: listFaultNotes(fault.id),
    notifications: [
      level === "plusplus" ? "Management escalation queued." : "Supervisor escalation queued."
    ]
  };
}

export function updateFaultStatus(
  id: string,
  input: { status: FaultStatus; expectedUpdatedAt?: string; overrideReason?: string; reopenReason?: string },
  actor?: FaultActor
) {
  const faults = readFaultsStore();
  const payload = faultStatusSchema.extend({
    expectedUpdatedAt: z.string().optional(),
    overrideReason: z.string().min(3).optional(),
    reopenReason: z.string().min(3).optional()
  }).parse(input);
  const actingUser = actor ?? currentUser;
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }
  ensureConcurrency(fault, payload.expectedUpdatedAt);
  const nowIso = new Date().toISOString();
  const previousStatus = fault.status;
  const beforeSnapshot = {
    status: previousStatus,
    feedbackStatus: fault.feedbackStatus ?? "pending",
    escalationLevel: fault.escalationLevel ?? "none",
    updatedAt: fault.updatedAt ?? null
  };

  if (payload.status === "closed" && fault.residentId && fault.feedbackStatus !== "yes" && !payload.overrideReason?.trim()) {
    throw new Error("Resident feedback is still pending. Add an override reason to close this fault.");
  }
  if (previousStatus === "closed" && payload.status !== "closed" && !payload.reopenReason?.trim()) {
    throw new Error("A reopen reason is required.");
  }

  fault.status = payload.status;
  fault.updatedAt = nowIso;
  fault.lastWorkedByEmail = actingUser.email;
  fault.lastWorkedAt = nowIso;
  if (!fault.statusHistory) {
    fault.statusHistory = [];
  }
  fault.statusHistory.push({ status: payload.status, at: nowIso, byEmail: actingUser.email });

  if (payload.status === "in-progress" && !fault.firstInProgressAt) {
    fault.firstInProgressAt = nowIso;
  }

  if (payload.status === "closed") {
    fault.closedAt = nowIso;
    fault.closedByAdminEmail = actingUser.email;
    fault.overrideReason = payload.overrideReason?.trim() || undefined;
  } else {
    fault.closedAt = payload.status === "archived" ? fault.closedAt : undefined;
    fault.closedByAdminEmail = payload.status === "archived" ? fault.closedByAdminEmail : undefined;
  }

  if (previousStatus === "closed" && payload.status !== "closed") {
    fault.reopenCount = (fault.reopenCount ?? 0) + 1;
    fault.reopenReason = payload.reopenReason?.trim() ?? undefined;
    fault.reopenedAt = nowIso;
    fault.escalationLevel = "none";
    fault.feedbackStatus = "pending";
    fault.closedAt = undefined;
    fault.closedByAdminEmail = undefined;
    fault.workflowDispatch = {
      ...(fault.workflowDispatch ?? {}),
      reopened: nowIso
    };
    void queueFaultWorkflowEmail({
      fault,
      stage: "reopened",
      actorName: actingUser.name,
      actorEmail: actingUser.email,
      reopenReason: payload.reopenReason?.trim()
    });
    void queueFaultReopenedTelegramAlert(fault, payload.reopenReason?.trim());
  }

  const reasonParts = [
    payload.overrideReason?.trim() ? `Override reason: ${payload.overrideReason.trim()}.` : "",
    payload.reopenReason?.trim() ? `Reopen reason: ${payload.reopenReason.trim()}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
  pushFaultAuditNote(
    fault.id,
    actingUser,
    `Status changed from ${previousStatus} to ${payload.status} by ${toActorDisplay(actingUser)}.${reasonParts ? ` ${reasonParts}` : ""}`,
    "system"
  );
  writeFaultsStore(faults);
  appendGovernanceAudit({
    area: "faults",
    entityId: fault.id,
    action: "fault.status-updated",
    actorName: actingUser.name,
    actorEmail: actingUser.email,
    before: beforeSnapshot,
    after: {
      status: fault.status,
      feedbackStatus: fault.feedbackStatus ?? "pending",
      escalationLevel: fault.escalationLevel ?? "none",
      updatedAt: fault.updatedAt ?? null
    },
    detail: `Status changed from ${previousStatus} to ${fault.status}.`
  });

  return {
    fault,
    notes: listFaultNotes(fault.id)
  };
}

export function updateFaultDetails(
  id: string,
  input: z.infer<typeof faultUpdateSchema>,
  actor?: FaultActor
) {
  const faults = readFaultsStore();
  const payload = faultUpdateSchema.parse(input);
  const actingUser = actor ?? currentUser;
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }

  ensureConcurrency(fault, payload.expectedUpdatedAt);
  const nowIso = new Date().toISOString();
  const beforeSnapshot = {
    title: fault.title,
    ethekwiniReference: fault.ethekwiniReference ?? null,
    category: fault.category,
    subCategory: fault.subCategory ?? null,
    priority: fault.priority,
    locationText: fault.locationText,
    assignedToEmail: fault.assignedToEmail ?? null,
    updatedAt: fault.updatedAt ?? null
  };
  const audit: string[] = [];

  const trackField = <K extends keyof Fault>(field: K, nextValue: Fault[K]) => {
    const previous = fault[field];
    if (previous === nextValue) return;
    fault[field] = nextValue;
    audit.push(`${String(field)}: "${String(previous ?? "")}" -> "${String(nextValue ?? "")}"`);
  };

  if (payload.title !== undefined) trackField("title", payload.title);
  if (payload.ethekwiniReference !== undefined) trackField("ethekwiniReference", payload.ethekwiniReference);
  if (payload.description !== undefined) trackField("description", payload.description);
  if (payload.category !== undefined) trackField("category", payload.category);
  if (payload.subCategory !== undefined) trackField("subCategory", payload.subCategory);
  if (payload.priority !== undefined) trackField("priority", payload.priority);
  if (payload.locationText !== undefined) trackField("locationText", payload.locationText);
  if (payload.latitude !== undefined) trackField("latitude", (payload.latitude ?? undefined) as Fault["latitude"]);
  if (payload.longitude !== undefined) trackField("longitude", (payload.longitude ?? undefined) as Fault["longitude"]);
  if (payload.mediaRefs !== undefined) {
    const currentMedia = fault.mediaRefs ?? [];
    const nextMedia = payload.mediaRefs ?? [];
    if (JSON.stringify(currentMedia) !== JSON.stringify(nextMedia)) {
      fault.mediaRefs = nextMedia;
      audit.push(`mediaRefs: "${currentMedia.length} file(s)" -> "${nextMedia.length} file(s)"`);
    }
  }
  if (payload.residentId !== undefined) trackField("residentId", payload.residentId || undefined);

  if (payload.assignedToEmail !== undefined) {
    const nextAssignedEmail = payload.assignedToEmail?.trim() || undefined;
    const previousAssignedEmail = fault.assignedToEmail?.trim() || undefined;
    if (nextAssignedEmail !== previousAssignedEmail) {
      if (previousAssignedEmail && fault.assignedAt) {
        const elapsedMs = nowIso ? new Date(nowIso).getTime() - new Date(fault.assignedAt).getTime() : 0;
        if (Number.isFinite(elapsedMs) && elapsedMs < REASSIGNMENT_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((REASSIGNMENT_COOLDOWN_MS - elapsedMs) / 1000);
          throw new Error(`Reassignment is locked for another ${remainingSeconds} second(s).`);
        }
      }
      trackField("assignedToEmail", nextAssignedEmail);
      trackField("assignedAdminName", nextAssignedEmail ? (payload.assignedAdminName ?? getFaultOwnerFromEmail(nextAssignedEmail)) : undefined);
      trackField("assignedAt", nowIso);
    } else if (nextAssignedEmail && payload.assignedAdminName !== undefined) {
      trackField("assignedAdminName", payload.assignedAdminName);
    }
  }

  if (audit.length === 0 && !payload.note?.trim()) {
    throw new Error("No fault changes were supplied.");
  }

  fault.updatedAt = nowIso;
  fault.lastWorkedAt = nowIso;
  fault.lastWorkedByEmail = actingUser.email;

  const noteBody = payload.note?.trim();
  if (noteBody) {
    pushFaultAuditNote(fault.id, actingUser, noteBody, "admin");
  }
  if (audit.length > 0) {
    pushFaultAuditNote(
      fault.id,
      actingUser,
      `Fault details updated by ${toActorDisplay(actingUser)}. ${audit.join("; ")}.`,
      "system"
    );
  }
  writeFaultsStore(faults);
  appendGovernanceAudit({
    area: "faults",
    entityId: fault.id,
    action: "fault.details-updated",
    actorName: actingUser.name,
    actorEmail: actingUser.email,
    before: beforeSnapshot,
    after: {
      title: fault.title,
      ethekwiniReference: fault.ethekwiniReference ?? null,
      category: fault.category,
      subCategory: fault.subCategory ?? null,
      priority: fault.priority,
      locationText: fault.locationText,
      assignedToEmail: fault.assignedToEmail ?? null,
      updatedAt: fault.updatedAt ?? null
    },
    detail: audit.join("; ")
  });

  return { fault, notes: listFaultNotes(fault.id) };
}

export function requestFaultResidentFeedback(id: string, actor?: FaultActor) {
  const faults = readFaultsStore();
  const actingUser = actor ?? currentUser;
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }
  if (!fault.residentId) {
    throw new Error("This fault is not linked to a resident.");
  }

  const resident = readResidentsStore().find((item) => item.id === fault.residentId);
  if (!resident?.phone) {
    throw new Error("Resident mobile number is required to request WhatsApp feedback.");
  }

  const normalizedPhone = resident.phone.replace(/\D/g, "");
  const mobile = normalizedPhone.startsWith("0")
    ? `27${normalizedPhone.slice(1)}`
    : normalizedPhone.startsWith("27")
      ? normalizedPhone
      : normalizedPhone;
  const message = `Please can we have feedback if "${fault.ethekwiniReference ?? fault.id}" has been closed, reply with Yes or No`;
  const whatsappUrl = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
  const nowIso = new Date().toISOString();

  fault.feedbackRequestedAt = nowIso;
  fault.feedbackRequestedByEmail = actingUser.email;
  fault.feedbackStatus = "pending";
  fault.updatedAt = nowIso;
  fault.lastWorkedAt = nowIso;
  fault.lastWorkedByEmail = actingUser.email;

  pushFaultAuditNote(
    fault.id,
    actingUser,
    `Feedback request sent to resident (${resident.name}) by ${toActorDisplay(actingUser)}.`,
    "system",
    "public-safe"
  );
  writeFaultsStore(faults);

  return { fault, whatsappUrl, notes: listFaultNotes(fault.id) };
}

export function captureFaultFeedback(id: string, feedback: "yes" | "no", actor?: FaultActor) {
  const faults = readFaultsStore();
  const actingUser = actor ?? currentUser;
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }

  const nowIso = new Date().toISOString();
  fault.feedbackStatus = feedback;
  fault.updatedAt = nowIso;
  fault.lastWorkedAt = nowIso;
  fault.lastWorkedByEmail = actingUser.email;
  pushFaultAuditNote(
    fault.id,
    actingUser,
    `Resident feedback captured as "${feedback.toUpperCase()}" by ${toActorDisplay(actingUser)}.`,
    "system"
  );
  writeFaultsStore(faults);

  return { fault, notes: listFaultNotes(fault.id) };
}

export function addFaultNote(
  id: string,
  input: { body: string; authorName?: string; includeInEmail?: boolean; visibility?: "internal" | "public-safe" }
): FaultNote {
  const faults = readFaultsStore();
  const faultNotes = readFaultNotesStore();
  const payload = faultNoteSchema.parse(input);
  const fault = faults.find((item) => item.id === id);
  if (!fault) {
    throw new Error("Fault not found");
  }

  const note: FaultNote = {
    id: `fault-note-${faultNotes.length + 1}`,
    faultId: id,
    body: payload.body,
    createdAt: new Date().toISOString(),
    authorName: payload.authorName || currentUser.name,
    includeInEmail: payload.includeInEmail,
    visibility: payload.visibility ?? "internal",
    source: "admin"
  };

  faultNotes.unshift(note);
  writeFaultNotesStore(faultNotes);
  return note;
}

function pushResidentHistory(item: Omit<ResidentHistoryItem, "id" | "createdAt">) {
  const residentHistory = readResidentHistoryStore();
  residentHistory.unshift({
    id: `resident-history-${residentHistory.length + 1}`,
    createdAt: new Date().toISOString(),
    ...item
  });
  writeResidentHistoryStore(residentHistory);
}

function pushResidentHistoryIfNotRecent(
  item: Omit<ResidentHistoryItem, "id" | "createdAt">,
  match: (entry: ResidentHistoryItem) => boolean,
  withinMinutes: number
) {
  const residentHistory = readResidentHistoryStore();
  const cutoff = Date.now() - withinMinutes * 60 * 1000;
  const recentMatch = residentHistory.find(
    (entry) =>
      entry.residentId === item.residentId &&
      match(entry) &&
      new Date(entry.createdAt).getTime() >= cutoff
  );

  if (recentMatch) {
    return false;
  }

  pushResidentHistory(item);
  return true;
}

function describeResidentFieldLabel(field: "name" | "email" | "phone" | "residentType" | "securityCompany" | "addressLine1" | "notes") {
  switch (field) {
    case "name":
      return "Full Name";
    case "email":
      return "Email Address";
    case "phone":
      return "Mobile Number";
    case "residentType":
      return "Resident Type";
    case "securityCompany":
      return "Security Company";
    case "addressLine1":
      return "Physical Address";
    case "notes":
      return "Additional Resident Internal Notes";
    default:
      return field;
  }
}

function describeResidentWorkflowFieldLabel(
  field: "addressVerified" | "mobileVerified" | "whatsappAdded" | "consentAccepted" | "submittedViaPublicForm"
) {
  switch (field) {
    case "addressVerified":
      return "Address Verified";
    case "mobileVerified":
      return "Mobile Verified";
    case "whatsappAdded":
      return "Added to WhatsApp";
    case "consentAccepted":
      return "Consent Accepted";
    case "submittedViaPublicForm":
      return "Submitted Via Public Form";
    default:
      return field;
  }
}

function getStatusReasonRequirement(status: ResidentStatus) {
  return status === "rejected" || status === "archived" || status === "pending";
}

function buildWorkflowNoteSuffix(note?: string) {
  const trimmed = note?.trim();
  return trimmed ? ` Note: ${trimmed}` : "";
}

function canResidentBeApproved(resident: Resident) {
  return Boolean(
    resident.addressVerified &&
      resident.mobileVerified &&
      resident.whatsappAdded &&
      resident.consentAccepted
  );
}

export function createResident(input: CreateResidentInput, actor?: ResidentActor): Resident {
  const payload = residentCreateSchema.parse(input);
  const createdBy = actor ?? currentUser;
  const residents = readResidentsStore();
  const resident: Resident = {
    id: `res-${residents.length + 1}`,
    name: payload.name,
    standNo: payload.standNo || "Not captured",
    residentType: payload.residentType ?? "resident",
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    securityCompany: payload.securityCompany || undefined,
    status: "active",
    addressLine1: payload.addressLine1,
    latitude: payload.latitude,
    longitude: payload.longitude,
    notes: payload.notes || undefined,
    addressVerified: true,
    mobileVerified: true,
    whatsappAdded: false,
    consentAccepted: true,
    submittedViaPublicForm: false
  };

  residents.unshift(resident);
  writeResidentsStore(residents);
  pushResidentHistory({
    residentId: resident.id,
    title: "Resident created",
    detail: `Resident was added directly in CommUNIT-E by ${createdBy.name} (${createdBy.email}) and activated immediately.`,
    tone: "success"
  });

  return resident;
}

export function findResidentDuplicate(input: {
  email: string;
  phone: string;
  addressLine1: string;
  excludeResidentId?: string;
}) {
  const residents = readResidentsStore();
  const email = normalizeResidentComparison(input.email);
  const phone = normalizeResidentComparison(input.phone).replace(/\s+/g, "");
  const address = normalizeResidentComparison(input.addressLine1);

  return residents.find((resident) => {
    if (input.excludeResidentId && resident.id === input.excludeResidentId) {
      return false;
    }

    const residentEmail = normalizeResidentComparison(resident.email);
    const residentPhone = normalizeResidentComparison(resident.phone).replace(/\s+/g, "");
    const residentAddress = normalizeResidentComparison(resident.addressLine1);

    return residentEmail === email || residentPhone === phone || residentAddress === address;
  });
}

export function createPublicResidentApplication(input: CreateResidentInput): Resident {
  const payload = residentCreateSchema.parse(input);
  const residents = readResidentsStore();
  const resident: Resident = {
    id: `res-${residents.length + 1}`,
    name: payload.name,
    standNo: payload.standNo || "Public application",
    residentType: "resident",
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    securityCompany: payload.securityCompany || undefined,
    status: "pending",
    addressLine1: payload.addressLine1,
    latitude: payload.latitude,
    longitude: payload.longitude,
    notes: payload.notes || undefined,
    addressVerified: false,
    mobileVerified: false,
    whatsappAdded: false,
    consentAccepted: true,
    submittedViaPublicForm: true
  };

  residents.unshift(resident);
  writeResidentsStore(residents);
  pushResidentHistory({
    residentId: resident.id,
    title: "Public application submitted",
    detail: `Resident submitted the public join form and is waiting for admin review. Submission email: ${resident.email ?? "Not captured"}.`,
    tone: "warning"
  });

  return resident;
}

export function updateResidentStatus(
  id: string,
  input: { status: ResidentStatus; reason?: string },
  actor?: ResidentActor
) {
  const payload = residentStatusSchema.parse(input);
  const changedBy = actor ?? currentUser;
  const residents = readResidentsStore();
  const resident = residents.find((item) => item.id === id);
  if (!resident) {
    throw new Error("Resident not found");
  }

  if (payload.status === "active" && !canResidentBeApproved(resident)) {
    throw new Error("Address Verified, Mobile Verified, Added to WhatsApp, and Consent Accepted must all be completed before approval.");
  }

  if (getStatusReasonRequirement(payload.status) && !payload.reason?.trim()) {
    throw new Error("A reason is required for this resident status change.");
  }

  resident.status = payload.status;
  writeResidentsStore(residents);
  const reasonDetail = payload.reason?.trim() ? ` Reason: ${payload.reason.trim()}.` : "";
  pushResidentHistory({
    residentId: resident.id,
    title: `Status changed to ${payload.status}`,
    detail: `${resident.name} was moved to ${payload.status} by ${changedBy.name} (${changedBy.email}).${reasonDetail}`,
    tone:
      payload.status === "active"
        ? "success"
        : payload.status === "rejected"
          ? "danger"
          : payload.status === "archived"
            ? "default"
            : "warning"
  });

  return {
    resident,
    history: listResidentHistory(resident.id)
  };
}

export function updateResidentDetails(
  id: string,
  input: z.infer<typeof residentUpdateSchema>,
  actor?: ResidentActor
) {
  const payload = residentUpdateSchema.parse(input);
  const changedBy = actor ?? currentUser;
  const residents = readResidentsStore();
  const resident = residents.find((item) => item.id === id);
  if (!resident) {
    throw new Error("Resident not found");
  }

  const proposedEmail = payload.email !== undefined ? payload.email : resident.email ?? "";
  const proposedPhone = payload.phone !== undefined ? payload.phone : resident.phone ?? "";
  const proposedAddress = payload.addressLine1 !== undefined ? payload.addressLine1 : resident.addressLine1 ?? "";
  const duplicate = findResidentDuplicate({
    email: proposedEmail,
    phone: proposedPhone,
    addressLine1: proposedAddress,
    excludeResidentId: resident.id
  });

  if (duplicate) {
    const duplicateReasons: string[] = [];
    if (normalizeResidentComparison(duplicate.email) === normalizeResidentComparison(proposedEmail)) {
      duplicateReasons.push("email address");
    }
    if (
      normalizeResidentComparison(duplicate.phone).replace(/\s+/g, "") ===
      normalizeResidentComparison(proposedPhone).replace(/\s+/g, "")
    ) {
      duplicateReasons.push("mobile number");
    }
    if (normalizeResidentComparison(duplicate.addressLine1) === normalizeResidentComparison(proposedAddress)) {
      duplicateReasons.push("physical address");
    }

    throw new Error(
      `Duplicate resident detected. The ${duplicateReasons.join(", ")} already matches ${duplicate.name}.`
    );
  }

  const workflowNoteSuffix = buildWorkflowNoteSuffix(payload.workflowNote);

  const trackedFields: Array<keyof typeof payload & ("name" | "email" | "phone" | "residentType" | "securityCompany" | "addressLine1" | "notes")> = [
    "name",
    "email",
    "phone",
    "residentType",
    "securityCompany",
    "addressLine1",
    "notes"
  ];

  const changes: string[] = [];

  for (const field of trackedFields) {
    if (!(field in payload) || payload[field] === undefined) {
      continue;
    }

    const nextValue = payload[field] === "" ? undefined : payload[field];
    const currentValue = resident[field];
    if ((currentValue ?? undefined) === nextValue) {
      continue;
    }

    resident[field] = nextValue as never;
    changes.push(
      `${describeResidentFieldLabel(field)} changed from "${currentValue ?? "Not captured"}" to "${nextValue ?? "Not captured"}"`
    );
  }

  const workflowFields: Array<
    keyof typeof payload & ("addressVerified" | "mobileVerified" | "whatsappAdded" | "consentAccepted" | "submittedViaPublicForm")
  > = ["addressVerified", "mobileVerified", "whatsappAdded", "consentAccepted", "submittedViaPublicForm"];

  for (const field of workflowFields) {
    if (!(field in payload) || payload[field] === undefined) {
      continue;
    }

    const nextValue = payload[field];
    const currentValue = resident[field];
    if (currentValue === nextValue) {
      continue;
    }

    resident[field] = nextValue as never;
    const workflowLabel = describeResidentWorkflowFieldLabel(field);
    const stateLabel = nextValue ? "Yes" : "No";

    let title = `${workflowLabel} updated`;
    let detail = `${changedBy.name} (${changedBy.email}) changed ${workflowLabel} to ${stateLabel}.${workflowNoteSuffix}`;

    if (field === "whatsappAdded") {
      title = nextValue ? "Added to WhatsApp" : "Removed from WhatsApp";
      detail = `${changedBy.name} (${changedBy.email}) ${nextValue ? "confirmed this resident was added to the WhatsApp group" : "removed the WhatsApp onboarding confirmation"}.${
        workflowNoteSuffix
      }`;
    } else if (field === "addressVerified") {
      title = nextValue ? "Address verified" : "Address verification removed";
      detail = `${changedBy.name} (${changedBy.email}) ${nextValue ? "verified the resident address" : "removed the address verification flag"}.${
        workflowNoteSuffix
      }`;
    } else if (field === "mobileVerified") {
      title = nextValue ? "Mobile verified" : "Mobile verification removed";
      detail = `${changedBy.name} (${changedBy.email}) ${nextValue ? "verified the resident mobile number" : "removed the mobile verification flag"}.${
        workflowNoteSuffix
      }`;
    } else if (field === "consentAccepted") {
      title = nextValue ? "Consent accepted" : "Consent acceptance removed";
      detail = `${changedBy.name} (${changedBy.email}) ${nextValue ? "confirmed consent acceptance" : "removed the consent acceptance confirmation"}.${
        workflowNoteSuffix
      }`;
    } else if (field === "submittedViaPublicForm") {
      title = nextValue ? "Marked as public form submission" : "Public form marker removed";
      detail = `${changedBy.name} (${changedBy.email}) updated the public form submission marker to ${stateLabel}.${workflowNoteSuffix}`;
    }

    pushResidentHistory({
      residentId: resident.id,
      title,
      detail,
      tone: nextValue ? "success" : "warning"
    });
  }

  if (payload.latitude !== undefined) {
    resident.latitude = payload.latitude;
  }

  if (payload.longitude !== undefined) {
    resident.longitude = payload.longitude;
  }

  if (changes.length === 0) {
    throw new Error("No resident details changed.");
  }

  writeResidentsStore(residents);
  if (changes.length > 0) {
    pushResidentHistory({
      residentId: resident.id,
      title: "Resident details updated",
      detail: `${changedBy.name} (${changedBy.email}) updated this resident. ${changes.join(". ")}.`,
      tone: "default"
    });
  }

  return {
    resident,
    history: listResidentHistory(resident.id)
  };
}

export function logResidentViewed(id: string, actor?: Pick<SessionUser, "name" | "email">) {
  const viewedBy = actor ?? currentUser;
  const residents = readResidentsStore();
  const resident = residents.find((item) => item.id === id);
  if (!resident) {
    throw new Error("Resident not found");
  }

  pushResidentHistoryIfNotRecent(
    {
      residentId: resident.id,
      title: "Resident record viewed",
      detail: `${viewedBy.name} (${viewedBy.email}) viewed this resident record.`,
      tone: "default"
    },
    (entry) =>
      entry.title === "Resident record viewed" &&
      entry.detail.includes(viewedBy.email),
    10
  );

  return {
    resident,
    history: listResidentHistory(resident.id)
  };
}

export function voteForIdea(id: string, userEmail = currentUser.email): ParkingLotIdea {
  const parkingLotIdeas = readParkingLotStore();
  const idea = parkingLotIdeas.find((item) => item.id === id);
  if (!idea) {
    throw new Error("Parking lot item not found");
  }

  if (!idea.votes.includes(userEmail)) {
    idea.votes.push(userEmail);
  }
  writeParkingLotStore(parkingLotIdeas);

  return idea;
}

export function listParkingLotIdeas() {
  return readParkingLotStore();
}

export function createParkingLotIdea(input: CreateParkingLotIdeaInput) {
  const payload = parkingLotCreateSchema.parse(input);
  const parkingLotIdeas = readParkingLotStore();
  const idea: ParkingLotIdea = {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title,
    justification: payload.justification,
    priority: payload.priority,
    status: "open",
    threshold: payload.threshold,
    votes: []
  };

  parkingLotIdeas.unshift(idea);
  writeParkingLotStore(parkingLotIdeas);
  return idea;
}

export function listProjects() {
  const storedProjects = readProjectsStore();
  storedProjects.forEach((project) => ensureProjectReferences(storedProjects, project));
  writeProjectsStore(storedProjects);
  return storedProjects;
}

export function listMeetingMinutes() {
  return readMeetingMinutesStore();
}

export function createMeetingMinute(input: CreateMeetingInput): MeetingMinute {
  const payload = meetingCreateSchema.parse(input);
  const storedMinutes = readMeetingMinutesStore();
  const minute: MeetingMinute = {
    id: `minute-${storedMinutes.length + 1}`,
    title: payload.title,
    meetingAt: payload.meetingAt,
    attendees: payload.attendees.split(",").map((entry) => entry.trim()).filter(Boolean),
    notes: payload.notes,
    actionItems: []
  };

  storedMinutes.unshift(minute);
  writeMeetingMinutesStore(storedMinutes);
  return minute;
}

export function createScheduledMeeting(
  input: ScheduleMeetingInput & {
    organizerEmail?: string;
    googleEventId?: string;
    calendarEventLink?: string;
  }
): MeetingMinute {
  const payload = meetingScheduleSchema.parse(input);
  const storedMinutes = readMeetingMinutesStore();
  const attendees = [...payload.requiredAttendees, ...payload.optionalAttendees];
  const meetingAt = new Date(`${payload.meetingDate}T${payload.startTime}:00+02:00`).toISOString();
  const endAt = new Date(`${payload.meetingDate}T${payload.endTime}:00+02:00`).toISOString();
  const minute: MeetingMinute = {
    id: `minute-${storedMinutes.length + 1}`,
    title: payload.title,
    meetingAt,
    endAt,
    meetingType: payload.meetingType,
    location: payload.location,
    organizerEmail: input.organizerEmail,
    googleEventId: input.googleEventId,
    calendarEventLink: input.calendarEventLink,
    requiredAttendees: payload.requiredAttendees,
    optionalAttendees: payload.optionalAttendees,
    attendees,
    notes: payload.agenda,
    actionItems: []
  };

  storedMinutes.unshift(minute);
  writeMeetingMinutesStore(storedMinutes);
  return minute;
}

export function createProject(input: CreateProjectInput, actor?: Pick<SessionUser, "name" | "email">): Project {
  const payload = projectCreateSchema.parse(input);
  const createdBy = actor ?? currentUser;
  const nowIso = new Date().toISOString();
  const storedProjects = readProjectsStore();
  const project: Project = {
    id: `proj-${storedProjects.length + 1}`,
    projectRef: generateUniqueProjectRef(storedProjects, createdBy),
    title: payload.title,
    description: payload.description,
    assignedAdminEmail: payload.assignedAdminEmail || undefined,
    assignedAdminName: payload.assignedAdminName || undefined,
    priority: payload.priority ?? "medium",
    createdAt: nowIso,
    updatedAt: nowIso,
    timelineStart: payload.timelineStart || undefined,
    timelineEnd: payload.timelineEnd || undefined,
    status: payload.status ?? "planned",
    gallery: [],
    tasks: []
  };

  storedProjects.unshift(project);
  writeProjectsStore(storedProjects);
  void queueProjectCriticalAlerts({ project, trigger: "created" });
  queueContextualAdminNotification({
    title: "Project Loaded",
    detail: `${project.title} has been loaded and assigned in Projects Manager.`,
    targetEmails: [project.assignedAdminEmail, createdBy.email],
    tone: "success"
  });
  return project;
}

export function addProjectTask(projectId: string, input: z.infer<typeof projectTaskCreateSchema>): ProjectTask {
  const payload = projectTaskCreateSchema.parse(input);
  const storedProjects = readProjectsStore();
  const project = storedProjects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  ensureProjectReferences(storedProjects, project);

  const nowIso = new Date().toISOString();
  const task: ProjectTask = {
    id: `task-${project.tasks.length + 1}-${Date.now()}`,
    taskRef: nextTaskRef(project),
    title: payload.title,
    assignee: payload.assignee || undefined,
    assigneeEmail: payload.assigneeEmail || undefined,
    dueDate: payload.dueDate || undefined,
    status: payload.status,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  project.tasks.unshift(task);
  project.updatedAt = nowIso;
  writeProjectsStore(storedProjects);
  queueContextualAdminNotification({
    title: "Task Loaded",
    detail: `${task.title} was loaded under ${project.title}.`,
    targetEmails: [task.assigneeEmail, project.assignedAdminEmail],
    tone: "success"
  });
  return task;
}

export function updateProjectTaskStatus(projectId: string, taskId: string, status: ProjectTask["status"]) {
  projectTaskStatusSchema.parse({ status });
  const storedProjects = readProjectsStore();
  const project = storedProjects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const previousStatus = task.status;
  const nowIso = new Date().toISOString();
  task.status = status;
  task.updatedAt = nowIso;
  project.updatedAt = nowIso;
  writeProjectsStore(storedProjects);
  if (previousStatus !== status) {
    if (status === "blocked") {
      void queueTaskCriticalAlerts({ project, task, previousStatus });
    }
    queueContextualAdminNotification({
      title: "Task Status Updated",
      detail: `${task.title} moved from ${previousStatus} to ${status}.`,
      targetEmails: [task.assigneeEmail, project.assignedAdminEmail],
      tone: status === "blocked" ? "danger" : "warning",
      importance: status === "blocked" ? "critical" : "informational"
    });
  }
  return { project, task };
}

export function updateProject(projectId: string, input: z.infer<typeof projectUpdateSchema>) {
  const payload = projectUpdateSchema.parse(input);
  const storedProjects = readProjectsStore();
  const project = storedProjects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const previousStatus = project.status;
  if (payload.title !== undefined) {
    project.title = payload.title;
  }
  if (payload.description !== undefined) {
    project.description = payload.description;
  }
  if (payload.assignedAdminEmail !== undefined) {
    project.assignedAdminEmail = payload.assignedAdminEmail || undefined;
  }
  if (payload.assignedAdminName !== undefined) {
    project.assignedAdminName = payload.assignedAdminName || undefined;
  }
  if (payload.status !== undefined) {
    project.status = payload.status;
  }
  if (payload.priority !== undefined) {
    project.priority = payload.priority;
  }
  if (payload.timelineStart !== undefined) {
    project.timelineStart = payload.timelineStart || undefined;
  }
  if (payload.timelineEnd !== undefined) {
    project.timelineEnd = payload.timelineEnd || undefined;
  }
  project.updatedAt = new Date().toISOString();

  writeProjectsStore(storedProjects);
  if (payload.status && previousStatus !== payload.status) {
    if (payload.status === "blocked") {
      void queueProjectCriticalAlerts({ project, previousStatus, trigger: "status-blocked" });
    }
    queueContextualAdminNotification({
      title: "Project Status Updated",
      detail: `${project.title} moved from ${previousStatus} to ${payload.status}.`,
      targetEmails: [project.assignedAdminEmail],
      tone: payload.status === "blocked" ? "danger" : "warning",
      importance: payload.status === "blocked" ? "critical" : "informational"
    });
  }
  return project;
}

export function updateProjectTask(projectId: string, taskId: string, input: z.infer<typeof projectTaskUpdateSchema>) {
  const payload = projectTaskUpdateSchema.parse(input);
  const storedProjects = readProjectsStore();
  const project = storedProjects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  const previousStatus = task.status;
  if (payload.title !== undefined) {
    task.title = payload.title;
  }
  if (payload.assignee !== undefined) {
    task.assignee = payload.assignee || undefined;
  }
  if (payload.assigneeEmail !== undefined) {
    task.assigneeEmail = payload.assigneeEmail || undefined;
  }
  if (payload.dueDate !== undefined) {
    task.dueDate = payload.dueDate || undefined;
  }
  if (payload.status !== undefined) {
    task.status = payload.status;
  }
  const nowIso = new Date().toISOString();
  task.updatedAt = nowIso;
  project.updatedAt = nowIso;

  writeProjectsStore(storedProjects);
  if (payload.status && previousStatus !== payload.status) {
    if (payload.status === "blocked") {
      void queueTaskCriticalAlerts({ project, task, previousStatus });
    }
    queueContextualAdminNotification({
      title: "Task Status Updated",
      detail: `${task.title} moved from ${previousStatus} to ${payload.status}.`,
      targetEmails: [task.assigneeEmail, project.assignedAdminEmail],
      tone: payload.status === "blocked" ? "danger" : "warning",
      importance: payload.status === "blocked" ? "critical" : "informational"
    });
  }
  return { project, task };
}

export function promoteIdea(id: string, actor?: Pick<SessionUser, "name" | "email">): { idea: ParkingLotIdea; project: Project } {
  const parkingLotIdeas = readParkingLotStore();
  const idea = parkingLotIdeas.find((item) => item.id === id);
  if (!idea) {
    throw new Error("Parking lot item not found");
  }

  const promotedBy = actor ?? currentUser;
  idea.status = "promoted";
  const storedProjects = readProjectsStore();
  const project: Project = {
    id: `proj-${storedProjects.length + 1}`,
    projectRef: generateUniqueProjectRef(storedProjects, promotedBy),
    title: idea.title,
    description: idea.justification,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "planned",
    gallery: [],
    tasks: []
  };
  storedProjects.unshift(project);
  writeProjectsStore(storedProjects);
  writeParkingLotStore(parkingLotIdeas);

  return { idea, project };
}

export function approvePRComm(id: string, actor?: Pick<SessionUser, "email" | "role" | "name"> | string): PRComm {
  const prComms = readPRCommsStore();
  const item = prComms.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("Communication not found");
  }

  const approver =
    typeof actor === "string"
      ? { email: actor, role: "ADMIN" as const, name: actor }
      : actor ?? currentUser;
  const approverEmail = approver.email.trim().toLowerCase();
  const creatorEmail = item.createdByEmail?.trim().toLowerCase();

  if (approver.role !== "ADMIN" && approver.role !== "SUPER_ADMIN") {
    throw new Error("Only admins can approve communication drafts.");
  }

  if (creatorEmail && approverEmail === creatorEmail) {
    throw new Error("The draft owner cannot approve their own communication.");
  }

  if (!item.approvers.map((entry) => entry.toLowerCase()).includes(approverEmail)) {
    item.approvers.push(approverEmail);
  }
  item.appCount = item.approvers.length;
  if (item.appCount >= 2) {
    item.status = "approved";
  } else {
    item.status = "pending-approval";
  }
  writePRCommsStore(prComms);
  appendGovernanceAudit({
    area: "communications",
    entityId: item.id,
    action: "communication.approved",
    actorName: approver.name,
    actorEmail: approver.email,
    before: {
      status: item.status,
      appCount: Math.max(0, item.appCount - 1)
    },
    after: {
      status: item.status,
      appCount: item.appCount
    },
    detail: `Communication approval recorded (${item.appCount}/2).`
  });

  return item;
}

export function sendPRComm(id: string) {
  const prComms = readPRCommsStore();
  const item = prComms.find((entry) => entry.id === id);
  if (!item) {
    throw new Error("Communication not found");
  }

  const uniqueApprovers = Array.from(new Set(item.approvers.map((entry) => entry.trim().toLowerCase()).filter(Boolean)));
  const creatorEmail = item.createdByEmail?.trim().toLowerCase();
  const validApprovers = creatorEmail
    ? uniqueApprovers.filter((approver) => approver !== creatorEmail)
    : uniqueApprovers;

  if (validApprovers.length < 2) {
    throw new Error("Two unique admin approvals are required before sending");
  }

  item.approvers = uniqueApprovers;
  item.appCount = uniqueApprovers.length;
  const beforeStatus = item.status;
  item.status = "sent";
  writePRCommsStore(prComms);
  appendGovernanceAudit({
    area: "communications",
    entityId: item.id,
    action: "communication.sent",
    before: { status: beforeStatus, appCount: item.appCount },
    after: { status: item.status, appCount: item.appCount },
    detail: "Communication moved to sent after unique approvals."
  });
  return item;
}

export function listPRComms() {
  return readPRCommsStore();
}

export function createPRComm(input: CreatePRCommInput, actor?: Pick<SessionUser, "email" | "name">): PRComm {
  const prComms = readPRCommsStore();
  const payload = prCommCreateSchema.parse(input);
  const createdBy = actor ?? currentUser;
  const nowIso = new Date().toISOString();
  const item: PRComm = {
    id: `pr-${prComms.length + 1}`,
    headline: payload.headline,
    body: payload.body,
    channel: payload.channel,
    mediaRefs: payload.mediaRefs ?? [],
    status: "draft",
    approvers: [],
    appCount: 0,
    createdAt: nowIso,
    createdByEmail: createdBy.email,
    createdByName: createdBy.name
  };

  prComms.unshift(item);
  writePRCommsStore(prComms);
  return item;
}

export function listVaultAssets() {
  return readVaultStore();
}

export function createVaultAsset(input: CreateVaultAssetInput): VaultAsset {
  const payload = vaultAssetCreateSchema.parse(input);
  const currentItems = readVaultStore();
  const item: VaultAsset = {
    id: randomUUID(),
    assetName: payload.assetName,
    filePath: payload.filePath ?? "",
    category: payload.category,
    description: payload.description,
    visibility: payload.visibility ?? "all"
  };

  writeVaultStore([item, ...currentItems]);
  return item;
}

export function listResolutions() {
  return readResolutionsStore();
}

export function createResolution(input: CreateResolutionInput): Resolution {
  const resolutions = readResolutionsStore();
  const payload = resolutionCreateSchema.parse(input);
  const item: Resolution = {
    id: `resolution-${resolutions.length + 1}`,
    title: payload.title,
    description: payload.description,
    type: payload.type,
    status: "open",
    deadlineAt: payload.deadlineAt,
    quorumTarget: 4,
    options: payload.options,
    votes: []
  };

  resolutions.unshift(item);
  writeResolutionsStore(resolutions);
  return item;
}

export function voteForResolution(id: string, choice: string, voter = currentUser.name) {
  const resolutions = readResolutionsStore();
  const resolution = resolutions.find((item) => item.id === id);
  if (!resolution) {
    throw new Error("Resolution not found");
  }

  if (!resolution.options.includes(choice)) {
    throw new Error("Invalid choice");
  }

  const existingVote = resolution.votes.find((vote) => vote.voter === voter);
  if (existingVote) {
    existingVote.choice = choice;
  } else {
    resolution.votes.push({ voter, choice });
  }

  const yesVotes = resolution.votes.filter((vote) => vote.choice === "Yes").length;
  if (resolution.type === "yes-no" && yesVotes >= resolution.quorumTarget) {
    resolution.status = "passed";
  }
  writeResolutionsStore(resolutions);
  appendGovernanceAudit({
    area: "resolutions",
    entityId: resolution.id,
    action: "resolution.vote-cast",
    actorName: voter,
    actorEmail: voter,
    before: { status: resolution.status, totalVotes: Math.max(0, resolution.votes.length - (existingVote ? 0 : 1)) },
    after: { status: resolution.status, totalVotes: resolution.votes.length, choice },
    detail: `Vote captured for option "${choice}".`
  });

  return resolution;
}

