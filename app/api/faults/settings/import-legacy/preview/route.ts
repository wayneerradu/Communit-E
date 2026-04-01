import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseLegacyFaultCsv } from "@/lib/fault-legacy-import";

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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseLegacyFaultCsv(Buffer.from(arrayBuffer));
    return NextResponse.json({
      ok: true,
      totalDrafts: parsed.drafts.length,
      warnings: parsed.warnings,
      previewRows: parsed.previewRows
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to preview legacy faults import." },
      { status: 400 }
    );
  }
}

