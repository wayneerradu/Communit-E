import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { purgeAdminNotifications } from "@/lib/notification-store";

export async function POST() {
  const user = await getSessionUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeAdminNotifications();

  return NextResponse.json({
    ok: true,
    message: "All notifications have been purged from the live feed and stored history."
  });
}
