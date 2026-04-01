import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getGoogleMailboxMessageById,
  sendGoogleMailboxMessage,
  setGoogleMailboxFlag,
  trashGoogleMailboxMessage
} from "@/lib/google-mailbox";
import {
  assignMailboxMessage,
  getMailboxActionByMessageId,
  markMailboxMessageActioned,
  markMailboxMessageRead,
  setMailboxMessageStatus,
  type MailboxWorkflowStatus
} from "@/lib/mailbox-action-store";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingAction = await getMailboxActionByMessageId(id);
  if (existingAction?.workflowStatus === "to-be-deleted") {
    return NextResponse.json({ error: "Message hidden in app (marked To Be Deleted)." }, { status: 404 });
  }

  const item = await getGoogleMailboxMessageById(id);
  if (!item) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  await markMailboxMessageRead(id, user.email, user.name);
  const action = await getMailboxActionByMessageId(id);

  return NextResponse.json({
    item: {
      ...item,
      actionedByName: action?.lastActionByName ?? action?.lastReadByName ?? "",
      actionType: action?.lastActionType ?? null,
      assignedToName: action?.assignedToName ?? "",
      assignedToEmail: action?.assignedToEmail ?? "",
      workflowStatus: action?.workflowStatus ?? "open"
    }
  });
}

function normalizeReplySubject(subject: string) {
  return subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
}

function normalizeForwardSubject(subject: string) {
  return subject.toLowerCase().startsWith("fwd:") ? subject : `Fwd: ${subject}`;
}

function parseMailboxAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  return value.trim();
}

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const payload = (await request.json()) as {
      action?: "reply" | "forward" | "assign" | "set-status" | "toggle-flag";
      to?: string;
      subject?: string;
      body?: string;
      assignedToEmail?: string;
      assignedToName?: string;
      workflowStatus?: MailboxWorkflowStatus;
      flagged?: boolean;
    };
    const action = payload.action;
    if (
      action !== "reply" &&
      action !== "forward" &&
      action !== "assign" &&
      action !== "set-status" &&
      action !== "toggle-flag"
    ) {
      return NextResponse.json({ error: "Unsupported mailbox action." }, { status: 400 });
    }

    if (action === "assign") {
      const assignedToEmail = payload.assignedToEmail?.trim().toLowerCase() ?? "";
      const assignedToName = payload.assignedToName?.trim() ?? "";
      if (!assignedToEmail || !assignedToName) {
        return NextResponse.json({ error: "Assignee is required." }, { status: 400 });
      }
      await assignMailboxMessage(id, user.email, user.name, assignedToEmail, assignedToName);
      return NextResponse.json({ ok: true, message: `Assigned to ${assignedToName}.` });
    }

    if (action === "set-status") {
      const nextStatus = payload.workflowStatus;
      const allowed: MailboxWorkflowStatus[] = [
        "open",
        "actioned",
        "ignored",
        "to-be-deleted",
        "needs-response",
        "waiting-external",
        "assigned-to-councillor"
      ];
      if (!nextStatus || !allowed.includes(nextStatus)) {
        return NextResponse.json({ error: "Valid mailbox status is required." }, { status: 400 });
      }
      await setMailboxMessageStatus(id, user.email, user.name, nextStatus);
      return NextResponse.json({ ok: true, message: `Status changed to ${nextStatus}.` });
    }

    if (action === "toggle-flag") {
      await setGoogleMailboxFlag(id, Boolean(payload.flagged));
      await markMailboxMessageActioned(id, user.email, user.name, "flag");
      return NextResponse.json({ ok: true, message: payload.flagged ? "Message flagged." : "Message unflagged." });
    }

    const source = await getGoogleMailboxMessageById(id);
    if (!source) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const fallbackBody =
      action === "reply"
        ? `Hello,\n\n${payload.body ?? ""}\n\nRegards,\n${user.name}`
        : `${payload.body ?? ""}\n\n---------- Forwarded message ----------\nFrom: ${source.from}\nDate: ${source.date}\nSubject: ${source.subject}\nTo: ${source.to}\n\n${source.textBody || source.snippet || ""}`;
    const nextTo = (payload.to?.trim() || (action === "reply" ? parseMailboxAddress(source.from) : "")).trim();
    if (!nextTo) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    const nextSubject = (payload.subject?.trim() ||
      (action === "reply" ? normalizeReplySubject(source.subject) : normalizeForwardSubject(source.subject))).trim();
    if (!nextSubject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    await sendGoogleMailboxMessage({
      to: nextTo,
      subject: nextSubject,
      body: fallbackBody,
      threadId: action === "reply" ? source.threadId ?? id : undefined,
      inReplyTo: action === "reply" ? source.messageId : undefined,
      references: action === "reply" ? source.messageId : undefined
    });
    await markMailboxMessageActioned(id, user.email, user.name, action);

    return NextResponse.json({ ok: true, message: action === "reply" ? "Reply sent." : "Forward sent." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message.";
    return NextResponse.json(
      {
        error: message.includes("insufficient") || message.includes("permission")
          ? "Mailbox is connected without send permissions. Reconnect Google Mailbox from Settings to grant send/delete scopes."
          : message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await trashGoogleMailboxMessage(id);
    await markMailboxMessageActioned(id, user.email, user.name, "delete");
    return NextResponse.json({ ok: true, message: "Message moved to trash." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete message.";
    return NextResponse.json(
      {
        error: message.includes("insufficient") || message.includes("permission")
          ? "Mailbox is connected without delete permissions. Reconnect Google Mailbox from Settings to grant send/delete scopes."
          : message
      },
      { status: 500 }
    );
  }
}
