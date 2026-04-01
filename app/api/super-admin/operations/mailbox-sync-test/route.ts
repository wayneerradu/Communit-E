import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { syncGoogleMailboxPreview } from "@/lib/google-mailbox";
import { queueConnectorFailureTelegramAlert } from "@/lib/telegram-critical-alerts";

export async function POST() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await syncGoogleMailboxPreview(5);
    return NextResponse.json({
      count: items.length,
      items,
      message: items.length
        ? `Mailbox sync connected. Pulled ${items.length} recent inbox message(s).`
        : "Mailbox is connected but no inbox messages were returned."
    });
  } catch (error) {
    await queueConnectorFailureTelegramAlert(
      "mailbox",
      error instanceof Error ? error.message : "Mailbox sync test failed."
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mailbox sync test failed." },
      { status: 500 }
    );
  }
}
