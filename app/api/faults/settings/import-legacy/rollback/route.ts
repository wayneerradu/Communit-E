import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getFaultImportBackup, listFaultImportBackups } from "@/lib/fault-import-backup-store";
import { writeFaultsStore } from "@/lib/fault-store";
import { appendGovernanceAudit } from "@/lib/governance-audit-store";

const rollbackSchema = z.object({
  backupId: z.string().min(1).optional()
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backups = await listFaultImportBackups();
  return NextResponse.json({
    items: backups.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      itemCount: item.itemCount
    }))
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = rollbackSchema.parse(await request.json().catch(() => ({})));
  const backups = await listFaultImportBackups();
  const fallback = backups[0];
  const backup = payload.backupId ? await getFaultImportBackup(payload.backupId) : fallback;

  if (!backup) {
    return NextResponse.json({ error: "No fault import backup found." }, { status: 404 });
  }

  writeFaultsStore(backup.faults);
  appendGovernanceAudit({
    area: "imports",
    entityId: backup.id,
    action: "faults.import-legacy-rollback",
    actorName: user.name,
    actorEmail: user.email,
    after: { itemCount: backup.itemCount },
    detail: "Faults restored from import backup."
  });
  return NextResponse.json({
    ok: true,
    restoredBackupId: backup.id,
    restoredAt: new Date().toISOString(),
    itemCount: backup.itemCount
  });
}
