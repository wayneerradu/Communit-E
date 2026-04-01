import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type GovernanceAuditEntry = {
  id: string;
  createdAt: string;
  area: "faults" | "residents" | "projects" | "communications" | "resolutions" | "settings" | "imports";
  entityId: string;
  action: string;
  actorName?: string;
  actorEmail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  detail?: string;
};

const dataDir = path.join(process.cwd(), "data");
const auditFile = path.join(dataDir, "governance-audit.json");

function ensureAuditFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(auditFile)) {
    writeFileSync(auditFile, "[]\n", "utf8");
  }
}

function readAuditItems() {
  ensureAuditFile();
  try {
    return JSON.parse(readFileSync(auditFile, "utf8")) as GovernanceAuditEntry[];
  } catch {
    return [];
  }
}

function writeAuditItems(items: GovernanceAuditEntry[]) {
  ensureAuditFile();
  writeFileSync(auditFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export function appendGovernanceAudit(entry: Omit<GovernanceAuditEntry, "id" | "createdAt">) {
  const items = readAuditItems();
  const item: GovernanceAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry
  };
  items.unshift(item);
  writeAuditItems(items.slice(0, 5000));
  return item;
}

export function listGovernanceAudit() {
  return readAuditItems();
}
