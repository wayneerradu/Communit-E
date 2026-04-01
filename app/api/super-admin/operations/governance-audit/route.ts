import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listGovernanceAudit } from "@/lib/governance-audit-store";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    items: listGovernanceAudit()
  });
}
