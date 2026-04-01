import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type MailboxActionType = "reply" | "forward" | "delete" | "flag";
export type MailboxWorkflowStatus =
  | "open"
  | "actioned"
  | "ignored"
  | "to-be-deleted"
  | "needs-response"
  | "waiting-external"
  | "assigned-to-councillor";

type MailboxActionRecord = {
  messageId: string;
  lastReadAt?: string;
  lastReadByEmail?: string;
  lastReadByName?: string;
  lastActionAt?: string;
  lastActionByEmail?: string;
  lastActionByName?: string;
  lastActionType?: MailboxActionType;
  assignedToEmail?: string;
  assignedToName?: string;
  workflowStatus?: MailboxWorkflowStatus;
  updatedAt?: string;
};

export type MailboxAuditEntry = {
  id: string;
  messageId: string;
  eventType: "read" | "action" | "assignment" | "status";
  actorEmail: string;
  actorName: string;
  detail: string;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const mailboxActionsFile = path.join(dataDir, "mailbox-actions.json");
const mailboxAuditFile = path.join(dataDir, "mailbox-audit.json");

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readMailboxActions(): Promise<MailboxActionRecord[]> {
  await ensureDataDir();
  try {
    const content = await readFile(mailboxActionsFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as MailboxActionRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeMailboxActions(records: MailboxActionRecord[]) {
  await ensureDataDir();
  await writeFile(mailboxActionsFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

async function readMailboxAudit(): Promise<MailboxAuditEntry[]> {
  await ensureDataDir();
  try {
    const content = await readFile(mailboxAuditFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as MailboxAuditEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeMailboxAudit(entries: MailboxAuditEntry[]) {
  await ensureDataDir();
  await writeFile(mailboxAuditFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

async function appendMailboxAudit(
  messageId: string,
  eventType: MailboxAuditEntry["eventType"],
  actorEmail: string,
  actorName: string,
  detail: string
) {
  const entries = await readMailboxAudit();
  entries.unshift({
    id: `${messageId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    messageId,
    eventType,
    actorEmail: actorEmail.trim().toLowerCase(),
    actorName,
    detail,
    createdAt: new Date().toISOString()
  });
  await writeMailboxAudit(entries.slice(0, 1000));
}

function upsertRecord(
  records: MailboxActionRecord[],
  messageId: string,
  updater: (current: MailboxActionRecord) => MailboxActionRecord
) {
  const index = records.findIndex((item) => item.messageId === messageId);
  const base: MailboxActionRecord = index >= 0 ? records[index] : { messageId };
  const next = updater(base);
  if (index >= 0) {
    records[index] = next;
  } else {
    records.unshift(next);
  }
  return records;
}

export async function markMailboxMessageRead(messageId: string, actorEmail: string, actorName: string) {
  const records = await readMailboxActions();
  upsertRecord(records, messageId, (current) => ({
    ...current,
    messageId,
    lastReadAt: new Date().toISOString(),
    lastReadByEmail: actorEmail.trim().toLowerCase(),
    lastReadByName: actorName,
    workflowStatus: current.workflowStatus ?? "open",
    updatedAt: new Date().toISOString()
  }));
  await writeMailboxActions(records);
  await appendMailboxAudit(messageId, "read", actorEmail, actorName, "Message opened/read.");
}

export async function markMailboxMessageActioned(
  messageId: string,
  actorEmail: string,
  actorName: string,
  actionType: MailboxActionType
) {
  const records = await readMailboxActions();
  upsertRecord(records, messageId, (current) => ({
    ...current,
    messageId,
    lastActionAt: new Date().toISOString(),
    lastActionByEmail: actorEmail.trim().toLowerCase(),
    lastActionByName: actorName,
    lastActionType: actionType,
    workflowStatus: current.workflowStatus === "open" ? "actioned" : current.workflowStatus,
    updatedAt: new Date().toISOString()
  }));
  await writeMailboxActions(records);
  await appendMailboxAudit(
    messageId,
    "action",
    actorEmail,
    actorName,
    `Message actioned with "${actionType}".`
  );
}

export async function getMailboxActionsByMessageIds(messageIds: string[]) {
  const records = await readMailboxActions();
  const messageIdSet = new Set(messageIds);
  const map = new Map<string, MailboxActionRecord>();

  for (const record of records) {
    if (messageIdSet.has(record.messageId)) {
      map.set(record.messageId, record);
    }
  }

  return map;
}

export async function getMailboxActionByMessageId(messageId: string) {
  const records = await readMailboxActions();
  return records.find((item) => item.messageId === messageId) ?? null;
}

export async function assignMailboxMessage(
  messageId: string,
  actorEmail: string,
  actorName: string,
  assignedToEmail: string,
  assignedToName: string
) {
  const records = await readMailboxActions();
  upsertRecord(records, messageId, (current) => ({
    ...current,
    messageId,
    assignedToEmail: assignedToEmail.trim().toLowerCase(),
    assignedToName,
    workflowStatus: current.workflowStatus ?? "open",
    updatedAt: new Date().toISOString()
  }));
  await writeMailboxActions(records);
  await appendMailboxAudit(
    messageId,
    "assignment",
    actorEmail,
    actorName,
    `Assigned/Reassigned to ${assignedToName} (${assignedToEmail.trim().toLowerCase()}).`
  );
}

export async function setMailboxMessageStatus(
  messageId: string,
  actorEmail: string,
  actorName: string,
  workflowStatus: MailboxWorkflowStatus
) {
  const records = await readMailboxActions();
  upsertRecord(records, messageId, (current) => ({
    ...current,
    messageId,
    workflowStatus,
    updatedAt: new Date().toISOString()
  }));
  await writeMailboxActions(records);
  await appendMailboxAudit(messageId, "status", actorEmail, actorName, `Status set to "${workflowStatus}".`);
}

export async function listMailboxAuditEntries() {
  const entries = await readMailboxAudit();
  return entries
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
