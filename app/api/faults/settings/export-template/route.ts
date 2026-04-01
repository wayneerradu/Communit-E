import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import { readPlatformSettings } from "@/lib/platform-store";

function rowFromContacts(
  key: string,
  initialEmails: string[],
  plusEmails: string[],
  plusPlusEmails: string[]
) {
  const [categoryRaw, ...subParts] = key.split("::");
  return [
    subParts.join("::"),
    categoryRaw,
    initialEmails.join("; "),
    plusEmails.join("; "),
    plusPlusEmails.join("; ")
  ];
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readPlatformSettings();
  const initial = settings.faultEscalation.initialContacts.filter((item) => item.active).map((item) => item.email);
  const plus = settings.faultEscalation.escalatePlusBySubCategory;
  const plusPlus = settings.faultEscalation.escalatePlusPlusBySubCategory;
  const allKeys = Array.from(new Set([...Object.keys(plus), ...Object.keys(plusPlus)])).sort();

  const rows: string[][] = [["Sub Category", "Category", "Escalate", "Escalate+", "Escalate++"]];
  allKeys.forEach((key) => {
    rows.push(
      rowFromContacts(
        key,
        initial,
        (plus[key] ?? []).filter((item) => item.active).map((item) => item.email),
        (plusPlus[key] ?? []).filter((item) => item.active).map((item) => item.email)
      )
    );
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "EscalationTemplate");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(output), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"fault-escalation-backup-${new Date().toISOString().slice(0, 10)}.xlsx\"`,
      "Cache-Control": "no-store"
    }
  });
}
