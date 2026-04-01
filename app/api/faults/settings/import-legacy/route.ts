import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createFaultImportBackup } from "@/lib/fault-import-backup-store";
import { readFaultsStore } from "@/lib/fault-store";
import { appendGovernanceAudit } from "@/lib/governance-audit-store";
import { importLegacyFaultsIntoStore, parseLegacyFaultCsv } from "@/lib/fault-legacy-import";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach a legacy faults CSV file." }, { status: 400 });
  }
  const replaceExistingRaw = String(formData.get("replaceExisting") ?? "false").toLowerCase();
  const replaceExisting = replaceExistingRaw === "true";
  const dryRunRaw = String(formData.get("dryRun") ?? "false").toLowerCase();
  const dryRun = dryRunRaw === "true";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseLegacyFaultCsv(Buffer.from(arrayBuffer));
    if (dryRun) {
      const existing = readFaultsStore();
      const existingRefs = new Set(
        existing.map((item) => (item.ethekwiniReference ?? "").trim().toLowerCase()).filter(Boolean)
      );
      const wouldSkipExisting = replaceExisting
        ? 0
        : parsed.drafts.filter((item) => existingRefs.has(item.ethekwiniReference.trim().toLowerCase())).length;

      return NextResponse.json({
        ok: true,
        dryRun: true,
        totalDrafts: parsed.drafts.length,
        wouldImport: replaceExisting ? parsed.drafts.length : Math.max(0, parsed.drafts.length - wouldSkipExisting),
        wouldSkipExisting,
        warnings: parsed.warnings,
        previewRows: parsed.previewRows
      });
    }

    const backup = await createFaultImportBackup(readFaultsStore());
    const result = importLegacyFaultsIntoStore(parsed, { replaceExisting });
    appendGovernanceAudit({
      area: "imports",
      entityId: backup.id,
      action: "faults.import-legacy",
      actorName: user.name,
      actorEmail: user.email,
      before: { itemCount: backup.itemCount },
      after: { itemCount: readFaultsStore().length, importedCount: result.importedCount, skippedExisting: result.skippedExisting },
      detail: "Legacy faults import committed."
    });
    return NextResponse.json({
      ok: true,
      backupId: backup.id,
      backupCreatedAt: backup.createdAt,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import legacy faults." },
      { status: 400 }
    );
  }
}
