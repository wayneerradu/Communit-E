import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { readFaultsStore, writeFaultsStore } from "@/lib/fault-store";
import type { Fault } from "@/types/domain";

type LegacyFaultDraft = {
  row: number;
  ethekwiniReference: string;
  title: string;
  description: string;
  reporterEmail: string;
  category: string;
  subCategory?: string;
  priority: Fault["priority"];
  status: Fault["status"];
  locationText: string;
  mediaRefs: string[];
  loggedByAdminName?: string;
  loggedByAdminEmail?: string;
  createdAt: string;
  escalatedAt: string;
  firstInProgressAt?: string;
  closedAt?: string;
  statusHistory: NonNullable<Fault["statusHistory"]>;
};

export type LegacyFaultPreviewRow = {
  row: number;
  reference: string;
  title: string;
  category: string;
  subCategory?: string;
  status: Fault["status"];
  createdAt: string;
  locationText: string;
  reporterEmail: string;
  mediaCount: number;
};

export type LegacyFaultImportResult = {
  drafts: LegacyFaultDraft[];
  warnings: string[];
  previewRows: LegacyFaultPreviewRow[];
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\u202a|\u202c/g, "")
    .trim();
}

function normalizeEmail(value: string) {
  const email = clean(value).toLowerCase();
  if (!email || ["did not submit form", "none", "na", "n/a", "-"].includes(email)) {
    return "";
  }
  return email;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseLegacyDate(raw: string) {
  const value = clean(raw);
  if (!value) {
    return undefined;
  }

  const ymd = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T08:00:00+02:00`).toISOString();
  }

  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T08:00:00+02:00`).toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return undefined;
}

function mapNatureToFaultTaxonomy(rawNature: string) {
  const nature = clean(rawNature).toLowerCase();
  if (!nature) {
    return { category: "roads", subCategory: "Obstruction on Road", priority: "medium" as const };
  }

  if (nature.includes("streetlight")) {
    return { category: "electricity", subCategory: "Street Light Fault", priority: "medium" as const };
  }
  if (nature.includes("electric")) {
    return { category: "electricity", subCategory: "Loss Of Electricity", priority: "high" as const };
  }
  if (nature.includes("water")) {
    return { category: "water-management", subCategory: "Water Leaks", priority: "medium" as const };
  }
  if (nature.includes("sewage") || nature.includes("sanitation")) {
    return { category: "waste-water", subCategory: "Sewage Issues", priority: "high" as const };
  }
  if (nature.includes("pollution") || nature.includes("dump")) {
    return { category: "cleansing-solid-waste", subCategory: "Illegal Dumping", priority: "medium" as const };
  }
  if (nature.includes("verge") || nature.includes("vegetation")) {
    return { category: "parks-recreation", subCategory: "Verges", priority: "medium" as const };
  }
  if (nature.includes("road")) {
    return { category: "roads", subCategory: "Pot Hole", priority: "medium" as const };
  }

  return { category: "roads", subCategory: "Obstruction on Road", priority: "medium" as const };
}

function mapLegacyStatus(rawStatus: string) {
  const value = clean(rawStatus).toLowerCase();
  if (value.includes("resolved")) {
    return "archived" as const;
  }
  if (value.includes("progress")) {
    return "in-progress" as const;
  }
  return "escalated" as const;
}

function extractRoadTitle(address: string) {
  return clean(address).split(",")[0] ?? "";
}

function parseMediaRefs(cellA: string, cellB: string) {
  const urls = [clean(cellA), clean(cellB)]
    .flatMap((value) => value.split(/[,\s]+/g))
    .map((value) => value.trim())
    .filter((value) => value.startsWith("http://") || value.startsWith("https://"));
  return Array.from(new Set(urls)).slice(0, 4);
}

export function parseLegacyFaultCsv(buffer: Buffer): LegacyFaultImportResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

  const warnings: string[] = [];
  const drafts: LegacyFaultDraft[] = [];
  const dedupe = new Set<string>();

  rows.forEach((row, idx) => {
    const line = idx + 2;
    const firstName = clean(row["First Name"]);
    const lastName = clean(row["Last Name"]);
    const computedName = clean(row["_ComputedName"]);
    const fullName = computedName || [firstName, lastName].filter(Boolean).join(" ").trim();
    const address = clean(row["Physical Address"]);
    const dateLogged = clean(row["Date Fault Logged"]);
    const referenceRaw = clean(row["Ethekwini Reference Number"]);
    const nature = clean(row["Nature Of Fault"]);
    const notes = clean(row["Notes: (Optional)"]);
    const emailRaw = normalizeEmail(clean(row["Email Address"]));
    const statusRaw = clean(row["Status"]);
    const addImages = clean(row["Add Images"]);
    const addImage = clean(row["Add Image"]);

    const createdAt = parseLegacyDate(dateLogged) ?? new Date().toISOString();
    const status = mapLegacyStatus(statusRaw);
    const mapped = mapNatureToFaultTaxonomy(nature);
    const reporterEmail = isValidEmail(emailRaw) ? emailRaw : "hello@unityincommunity.org.za";
    const reference = referenceRaw || `LEGACY-${line}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const dedupeKey = `${reference.toLowerCase()}|${address.toLowerCase()}|${nature.toLowerCase()}`;

    if (dedupe.has(dedupeKey)) {
      warnings.push(`Row ${line}: duplicate row skipped for reference "${reference}".`);
      return;
    }
    dedupe.add(dedupeKey);

    if (!address) {
      warnings.push(`Row ${line}: missing Physical Address, row skipped.`);
      return;
    }
    if (!nature) {
      warnings.push(`Row ${line}: missing Nature Of Fault, row skipped.`);
      return;
    }
    if (!referenceRaw) {
      warnings.push(`Row ${line}: missing Ethekwini Reference Number, generated "${reference}".`);
    }
    if (!emailRaw) {
      warnings.push(`Row ${line}: missing Email Address, fallback reporter email used.`);
    } else if (!isValidEmail(emailRaw)) {
      warnings.push(`Row ${line}: invalid Email Address "${emailRaw}", fallback reporter email used.`);
    }

    const titleRoad = extractRoadTitle(address);
    const title = `${nature}${titleRoad ? ` - ${titleRoad}` : ""}`.slice(0, 160);
    const description = [
      `Imported from legacy faults register.`,
      `Nature: ${nature}.`,
      notes ? `Legacy notes: ${notes}` : ""
    ]
      .filter(Boolean)
      .join(" ");

    const statusHistory: NonNullable<Fault["statusHistory"]> = [
      { status: "escalated", at: createdAt, byEmail: reporterEmail }
    ];
    let firstInProgressAt: string | undefined;
    let closedAt: string | undefined;
    if (status === "in-progress") {
      firstInProgressAt = createdAt;
      statusHistory.push({ status: "in-progress", at: createdAt, byEmail: reporterEmail });
    } else if (status === "archived") {
      closedAt = createdAt;
      statusHistory.push({ status: "archived", at: createdAt, byEmail: reporterEmail });
    }

    drafts.push({
      row: line,
      ethekwiniReference: reference,
      title,
      description,
      reporterEmail,
      category: mapped.category,
      subCategory: mapped.subCategory,
      priority: mapped.priority,
      status,
      locationText: address,
      mediaRefs: parseMediaRefs(addImages, addImage),
      loggedByAdminName: fullName || undefined,
      loggedByAdminEmail: isValidEmail(emailRaw) ? emailRaw : undefined,
      createdAt,
      escalatedAt: createdAt,
      firstInProgressAt,
      closedAt,
      statusHistory
    });
  });

  return {
    drafts,
    warnings,
    previewRows: drafts.slice(0, 100).map((item) => ({
      row: item.row,
      reference: item.ethekwiniReference,
      title: item.title,
      category: item.category,
      subCategory: item.subCategory,
      status: item.status,
      createdAt: item.createdAt,
      locationText: item.locationText,
      reporterEmail: item.reporterEmail,
      mediaCount: item.mediaRefs.length
    }))
  };
}

function nextFaultId(existing: Fault[]) {
  const max = existing
    .map((item) => Number.parseInt(item.id.replace("fault-", ""), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((acc, value) => Math.max(acc, value), 0);
  return max + 1;
}

export function importLegacyFaultsIntoStore(input: LegacyFaultImportResult, options?: { replaceExisting?: boolean }) {
  const existing = readFaultsStore();
  const faults = options?.replaceExisting ? [] : [...existing];
  const existingRefs = new Set(
    faults
      .map((item) => clean(item.ethekwiniReference).toLowerCase())
      .filter(Boolean)
  );

  let idCounter = nextFaultId(faults);
  let importedCount = 0;
  let skippedExisting = 0;

  input.drafts.forEach((draft) => {
    const refKey = clean(draft.ethekwiniReference).toLowerCase();
    if (!options?.replaceExisting && refKey && existingRefs.has(refKey)) {
      skippedExisting += 1;
      return;
    }

    const imported: Fault = {
      id: `fault-${idCounter++}`,
      title: draft.title,
      ethekwiniReference: draft.ethekwiniReference,
      description: draft.description,
      reporterEmail: draft.reporterEmail,
      category: draft.category,
      subCategory: draft.subCategory,
      priority: draft.priority,
      status: draft.status,
      locationText: draft.locationText,
      mediaRefs: draft.mediaRefs,
      assignedAdminName: draft.loggedByAdminName,
      loggedByAdminName: draft.loggedByAdminName,
      loggedByAdminEmail: draft.loggedByAdminEmail,
      escalationLevel: "none",
      createdAt: draft.createdAt,
      escalatedAt: draft.escalatedAt,
      firstInProgressAt: draft.firstInProgressAt,
      closedAt: draft.closedAt,
      updatedAt: draft.createdAt,
      statusHistory: draft.statusHistory,
      escalationHistory: [{ level: "internal", at: draft.escalatedAt, byEmail: draft.reporterEmail }],
      escalationCount: 1,
      reopenCount: 0,
      feedbackStatus: "pending"
    };

    faults.unshift(imported);
    if (refKey) existingRefs.add(refKey);
    importedCount += 1;
  });

  writeFaultsStore(faults);
  return {
    importedCount,
    skippedExisting,
    totalDrafts: input.drafts.length,
    warnings: input.warnings
  };
}

