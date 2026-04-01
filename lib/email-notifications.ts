import { sendGoogleMailboxMessage } from "@/lib/google-mailbox";
import type { AppNotification, PlatformSettings } from "@/types/domain";

type EmailDispatchResult = {
  ok: boolean;
  mode: "off" | "live" | "demo";
  recipients: string[];
  reason?: string;
};

function normalizeEmails(items: Array<string | undefined>) {
  return Array.from(
    new Set(
      items
        .map((item) => item?.trim().toLowerCase())
        .filter((item): item is string => Boolean(item))
    )
  );
}

function resolveRecipients(notification: AppNotification, settings: PlatformSettings) {
  const mode = settings.communicationSettings.email.mode;
  if (mode === "off") {
    return { mode, recipients: [] };
  }

  const configured =
    mode === "demo"
      ? settings.communicationSettings.email.demoRecipients
      : settings.communicationSettings.email.liveRecipients;
  const fallback = notification.targetEmails ?? [];
  const recipients = normalizeEmails([...configured, ...fallback]);
  return { mode, recipients };
}

function buildSubject(notification: AppNotification, mode: "off" | "live" | "demo") {
  const prefix = mode === "demo" ? "[DEMO] " : "";
  return `${prefix}${notification.title}`.slice(0, 150);
}

function buildBody(notification: AppNotification, mode: "off" | "live" | "demo") {
  const lines = [
    mode === "demo"
      ? "This is a DEMO notification from CommUNIT-E."
      : "This is an operational notification from CommUNIT-E.",
    "",
    notification.detail,
    "",
    `Channel: ${notification.channel}`,
    `Importance: ${notification.importance ?? "informational"}`,
    `Time: ${new Date(notification.createdAt).toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg"
    })}`
  ];

  return lines.join("\n");
}

export async function dispatchEmailNotification(
  notification: AppNotification,
  settings: PlatformSettings
): Promise<EmailDispatchResult> {
  const resolved = resolveRecipients(notification, settings);
  if (resolved.mode === "off") {
    return {
      ok: false,
      mode: resolved.mode,
      recipients: [],
      reason: "Email notifications are disabled."
    };
  }

  if (resolved.recipients.length === 0) {
    return {
      ok: false,
      mode: resolved.mode,
      recipients: [],
      reason: "No recipients configured for this mode."
    };
  }

  try {
    await sendGoogleMailboxMessage({
      to: resolved.recipients.join(", "),
      subject: buildSubject(notification, resolved.mode),
      body: buildBody(notification, resolved.mode)
    });
    return {
      ok: true,
      mode: resolved.mode,
      recipients: resolved.recipients
    };
  } catch (error) {
    return {
      ok: false,
      mode: resolved.mode,
      recipients: resolved.recipients,
      reason: error instanceof Error ? error.message : "Unknown email delivery failure."
    };
  }
}
