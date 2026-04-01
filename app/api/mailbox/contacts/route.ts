import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listGoogleMailboxContacts, listGoogleMailboxMessages } from "@/lib/google-mailbox";

type FallbackContact = {
  id: string;
  name: string;
  email: string;
};

function parseSenderAddress(value: string) {
  const emailMatch = value.match(/<([^>]+)>/);
  const email = (emailMatch?.[1] ?? value).trim().toLowerCase();
  const name = value.includes("<") ? value.split("<")[0].trim().replace(/^"|"$/g, "") : email;
  if (!email.includes("@")) {
    return null;
  }
  return { name: name || email, email };
}

function parseAddressList(value: string) {
  return value
    .split(",")
    .map((part) => parseSenderAddress(part))
    .filter((item): item is { name: string; email: string } => Boolean(item));
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const q = url.searchParams.get("q") ?? "";

  try {
    const items = await listGoogleMailboxContacts(limit, q);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch contacts.";
    if (message.includes("insufficient")) {
      try {
        const [recentAny, recentSent] = await Promise.all([
          listGoogleMailboxMessages(50, "in:anywhere"),
          listGoogleMailboxMessages(50, "in:sent")
        ]);
        const byEmail = new Map<string, FallbackContact>();
        for (const mail of [...recentAny, ...recentSent]) {
          for (const parsed of parseAddressList(mail.from)) {
            if (!byEmail.has(parsed.email)) {
              byEmail.set(parsed.email, {
                id: parsed.email,
                name: parsed.name,
                email: parsed.email
              });
            }
          }
        }
        const normalizedQuery = q.trim().toLowerCase();
        const items = Array.from(byEmail.values())
          .filter((item) =>
            normalizedQuery
              ? [item.name, item.email].join(" ").toLowerCase().includes(normalizedQuery)
              : true
          )
          .slice(0, Math.max(5, Math.min(limit, 50)));

        return NextResponse.json({
          items,
          warning:
            "Google Contacts permission is missing. Showing recent email senders as fallback contacts."
        });
      } catch {
        // Fall through to standard error response.
      }
    }
    return NextResponse.json(
      {
        error: message.includes("insufficient")
          ? "Mailbox is connected without contacts permission. Reconnect Mailbox in Settings to grant Contacts access."
          : message
      },
      { status: 500 }
    );
  }
}
