import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { buildFaultEscalationLookupKey } from "@/lib/fault-escalation-keys";
import type { PlatformSettings } from "@/types/domain";

type Contact = PlatformSettings["faultEscalation"]["initialContacts"][number];

type FaultEscalationImportResult = {
  initialContacts: Contact[];
  escalatePlusBySubCategory: Record<string, Contact[]>;
  escalatePlusPlusBySubCategory: Record<string, Contact[]>;
  importedRows: number;
  warnings: string[];
  previewRows: Array<{
    row: number;
    key: string;
    category: string;
    subCategory: string;
    escalateCount: number;
    escalatePlusCount: number;
    escalatePlusPlusCount: number;
  }>;
};


function toContactName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeEmail(email: string) {
  return email
    .trim()
    .replace(/[<>]/g, "")
    .replace(/;+$/g, "")
    .replace(/,+$/g, "")
    .toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmailCell(raw: string) {
  return raw
    .split(/[;,]+/g)
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

function buildContacts(emails: string[], warningPrefix: string, warnings: string[]) {
  const deduped = Array.from(new Set(emails));
  const valid: string[] = [];

  deduped.forEach((email) => {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      warnings.push(`${warningPrefix}: skipped invalid email "${email}"`);
    }
  });

  return valid.map((email) => ({
    id: randomUUID(),
    name: toContactName(email),
    email,
    active: true
  }));
}

export function importFaultEscalationTemplate(buffer: Buffer): FaultEscalationImportResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
    defval: ""
  });

  const warnings: string[] = [];
  const initialEmailPool: string[] = [];
  const plusMap = new Map<string, string[]>();
  const plusPlusMap = new Map<string, string[]>();
  const previewRows: FaultEscalationImportResult["previewRows"] = [];
  let importedRows = 0;

  rows.forEach((row, index) => {
    const subCategory = String(row[0] ?? "").trim();
    const category = String(row[1] ?? "").trim();
    const escalate = String(row[2] ?? "").trim();
    const escalatePlus = String(row[3] ?? "").trim();
    const escalatePlusPlus = String(row[4] ?? "").trim();

    if (!subCategory && !category) {
      return;
    }

    const key = buildFaultEscalationLookupKey(category, subCategory);
    if (!key) {
      warnings.push(`Row ${index + 1}: skipped unknown category/subcategory "${category}" / "${subCategory}"`);
      return;
    }

    const level1Emails = parseEmailCell(escalate);
    const levelPlusEmails = parseEmailCell(escalatePlus);
    const levelPlusPlusEmails = parseEmailCell(escalatePlusPlus);

    initialEmailPool.push(...level1Emails);

    plusMap.set(key, [...(plusMap.get(key) ?? []), ...levelPlusEmails]);
    plusPlusMap.set(key, [...(plusPlusMap.get(key) ?? []), ...levelPlusPlusEmails]);
    previewRows.push({
      row: index + 1,
      key,
      category,
      subCategory,
      escalateCount: level1Emails.length,
      escalatePlusCount: levelPlusEmails.length,
      escalatePlusPlusCount: levelPlusPlusEmails.length
    });
    importedRows += 1;
  });

  const escalatePlusBySubCategory: Record<string, Contact[]> = {};
  const escalatePlusPlusBySubCategory: Record<string, Contact[]> = {};

  for (const [key, emails] of plusMap.entries()) {
    const contacts = buildContacts(emails, `Escalate+ ${key}`, warnings);
    if (contacts.length > 0) {
      escalatePlusBySubCategory[key] = contacts;
    }
  }

  for (const [key, emails] of plusPlusMap.entries()) {
    const contacts = buildContacts(emails, `Escalate++ ${key}`, warnings);
    if (contacts.length > 0) {
      escalatePlusPlusBySubCategory[key] = contacts;
    }
  }

  const initialContacts = buildContacts(initialEmailPool, "Escalate", warnings);

  if (importedRows === 0) {
    throw new Error("No valid escalation rows were found in the template.");
  }

  return {
    initialContacts,
    escalatePlusBySubCategory,
    escalatePlusPlusBySubCategory,
    importedRows,
    warnings,
    previewRows
  };
}
