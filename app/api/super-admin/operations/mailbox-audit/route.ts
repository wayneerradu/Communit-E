import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMailboxAuditEntries } from "@/lib/mailbox-action-store";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await listMailboxAuditEntries();
  return NextResponse.json({ items });
}
