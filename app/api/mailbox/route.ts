import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listGoogleMailboxPage } from "@/lib/google-mailbox";
import { getMailboxActionsByMessageIds } from "@/lib/mailbox-action-store";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const folder = (url.searchParams.get("folder") ?? "inbox").toLowerCase();
  const defaultQueryByFolder: Record<string, string> = {
    inbox: "in:inbox",
    sent: "in:sent",
    junk: "in:spam",
    deleted: "in:trash",
    flagged: "has:starred"
  };
  const q = url.searchParams.get("q") ?? defaultQueryByFolder[folder] ?? "in:inbox";
  const pageToken = url.searchParams.get("pageToken") ?? undefined;

  try {
    const page =
      folder === "inbox" && !url.searchParams.get("q") && !pageToken
        ? await (async () => {
            // Outlook-like behavior: keep a stable "last 20" baseline and show today's new messages on top.
            const todayPage = await listGoogleMailboxPage(50, "in:inbox newer_than:1d");
            const baselinePage = await listGoogleMailboxPage(Math.max(20, limit), "in:inbox older_than:1d");
            const seen = new Set<string>();
            const mergedItems = [...todayPage.items, ...baselinePage.items].filter((item) => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
            return {
              items: mergedItems,
              nextPageToken: baselinePage.nextPageToken
            };
          })()
        : await listGoogleMailboxPage(limit, q, pageToken);
    const actionMap = await getMailboxActionsByMessageIds(page.items.map((item) => item.id));
    const items = page.items
      .map((item) => {
        const action = actionMap.get(item.id);
        return {
          ...item,
          actionedByName: action?.lastActionByName ?? action?.lastReadByName ?? "",
          actionType: action?.lastActionType ?? null,
          assignedToName: action?.assignedToName ?? "",
          assignedToEmail: action?.assignedToEmail ?? "",
          workflowStatus: action?.workflowStatus ?? "open"
        };
      })
      .filter((item) => item.workflowStatus !== "to-be-deleted");
    return NextResponse.json({
      ...page,
      items
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch mailbox messages." },
      { status: 500 }
    );
  }
}
