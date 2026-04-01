import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { importFaultEscalationTemplate } from "@/lib/fault-escalation-import";
import { updatePlatformSettings } from "@/lib/platform-store";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach an Excel template file." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
    return NextResponse.json({ error: "Only .xlsx or .xls template files are supported." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const imported = importFaultEscalationTemplate(Buffer.from(arrayBuffer));

    await updatePlatformSettings((current) => ({
      ...current,
      faultEscalation: {
        initialContacts: imported.initialContacts,
        escalatePlusBySubCategory: imported.escalatePlusBySubCategory,
        escalatePlusPlusBySubCategory: imported.escalatePlusPlusBySubCategory
      },
      updatedAt: new Date().toISOString()
    }));

    return NextResponse.json({
      ok: true,
      importedRows: imported.importedRows,
      initialContactCount: imported.initialContacts.length,
      escalatePlusCount: Object.keys(imported.escalatePlusBySubCategory).length,
      escalatePlusPlusCount: Object.keys(imported.escalatePlusPlusBySubCategory).length,
      warnings: imported.warnings
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import escalation template." },
      { status: 400 }
    );
  }
}
