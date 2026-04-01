/**
 * Audit Service
 *
 * Thin wrapper that writes to both:
 *  1. The existing appendGovernanceAudit() (JSON-file based, works today)
 *  2. The Prisma AuditLog table (when DATABASE_URL is configured)
 *
 * Once the full Prisma migration is complete, the JSON-file path can be removed.
 */

import { appendGovernanceAudit } from "@/lib/governance-audit-store";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export type AuditSource = "manual" | "import" | "automatic";

export interface AuditEntry {
  actorEmail: string;
  actorName?: string;
  action: string;           // e.g. "fault.created", "resident.status_changed"
  entityType: string;       // e.g. "fault", "resident", "project"
  entityId: string;
  description?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  source?: AuditSource;
  reason?: string;
  // Optional FK shortcuts for faster querying
  faultId?: string;
  projectId?: string;
  assetId?: string;
}

/**
 * Write an audit entry to both stores.
 * Fire-and-forget on the DB write — never throws so it can't break a workflow.
 */
export function recordAudit(entry: AuditEntry): void {
  // 1. Write to the existing JSON-backed governance audit log (always works)
  appendGovernanceAudit({
    area: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorName: entry.actorName ?? entry.actorEmail,
    actorEmail: entry.actorEmail,
    before: entry.before,
    after: entry.after,
    detail: entry.description ?? "",
  });

  // 2. Mirror to Prisma AuditLog when the DB is configured
  if (isDatabaseConfigured()) {
    void prisma.auditLog
      .create({
        data: {
          actorEmail: entry.actorEmail,
          actorName: entry.actorName,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          description: entry.description,
          before: entry.before ?? undefined,
          after: entry.after ?? undefined,
          source: entry.source ?? "manual",
          reason: entry.reason,
          faultId: entry.faultId,
          projectId: entry.projectId,
          assetId: entry.assetId,
        },
      })
      .catch((err) => {
        // Best-effort — never block the request
        console.error("[audit-service] DB write failed:", err);
      });
  }
}
