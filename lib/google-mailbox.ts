import { updatePlatformSettings } from "@/lib/platform-store";
import { readGoogleMailboxConnection, writeGoogleMailboxConnection } from "@/lib/google-mailbox-store";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_PEOPLE_BASE = "https://people.googleapis.com/v1/people/me";

export type MailboxPreviewMessage = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
};

export type MailboxListPage = {
  items: MailboxPreviewMessage[];
  nextPageToken?: string;
};

export type MailboxContact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
};

export type MailboxMessageDetail = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  messageId?: string;
  snippet: string;
  textBody: string;
  htmlBody?: string;
  unread: boolean;
  starred: boolean;
};

export type MailboxDraftSendInput = {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};

async function refreshGoogleMailboxAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error("Unable to refresh Google Mailbox access token.");
  }

  return (await response.json()) as { access_token?: string; expires_in?: number };
}

async function getValidGoogleMailboxAccessToken() {
  const connection = await readGoogleMailboxConnection();
  if (!connection) {
    return null;
  }

  const expiresAt = new Date(connection.expiresAt).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000) {
    return connection.accessToken;
  }

  const refreshed = await refreshGoogleMailboxAccessToken(connection.refreshToken);
  if (!refreshed.access_token) {
    return null;
  }

  const nextConnection = {
    ...connection,
    accessToken: refreshed.access_token,
    expiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
  };

  await writeGoogleMailboxConnection(nextConnection);
  return nextConnection.accessToken;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildRawEmail(input: MailboxDraftSendInput) {
  const lines = [
    `To: ${input.to}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    `Subject: ${input.subject}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`] : []),
    ...(input.references ? [`References: ${input.references}`] : []),
    "",
    input.body
  ];
  return encodeBase64Url(lines.join("\r\n"));
}

function getHeaderValue(headers: Array<{ name?: string; value?: string }> | undefined, headerName: string) {
  const match = headers?.find((header) => header.name?.toLowerCase() === headerName.toLowerCase());
  return match?.value ?? "";
}

function decodeBase64Url(value?: string) {
  if (!value) return "";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

function extractBodyParts(part?: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string };
    parts?: any[];
  }>;
}): { textBody: string; htmlBody: string } {
  if (!part) {
    return { textBody: "", htmlBody: "" };
  }

  let textBody = "";
  let htmlBody = "";

  const bodyData = decodeBase64Url(part.body?.data);
  if (part.mimeType === "text/plain" && bodyData) {
    textBody += bodyData;
  }
  if (part.mimeType === "text/html" && bodyData) {
    htmlBody += bodyData;
  }

  for (const child of part.parts ?? []) {
    const extracted = extractBodyParts(child);
    textBody += extracted.textBody;
    htmlBody += extracted.htmlBody;
  }

  return { textBody, htmlBody };
}

export async function syncGoogleMailboxPreview(limit = 5): Promise<MailboxPreviewMessage[]> {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    return [];
  }

  const listResponse = await fetch(
    `${GMAIL_API_BASE}/messages?maxResults=${Math.max(1, Math.min(limit, 20))}&q=in:inbox`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!listResponse.ok) {
    throw new Error("Unable to fetch mailbox message list.");
  }

  const listPayload = (await listResponse.json()) as {
    messages?: Array<{ id?: string }>;
  };
  const messageIds = (listPayload.messages ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  const details = await Promise.all(
    messageIds.map(async (messageId) => {
      const detailResponse = await fetch(
        `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      if (!detailResponse.ok) {
        return null;
      }

      const detailPayload = (await detailResponse.json()) as {
        id?: string;
        snippet?: string;
        labelIds?: string[];
        payload?: {
          headers?: Array<{ name?: string; value?: string }>;
        };
      };

      return {
        id: detailPayload.id ?? messageId,
        subject: getHeaderValue(detailPayload.payload?.headers, "Subject") || "(No subject)",
        from: getHeaderValue(detailPayload.payload?.headers, "From") || "(Unknown sender)",
        date: getHeaderValue(detailPayload.payload?.headers, "Date") || "",
        snippet: detailPayload.snippet ?? "",
        unread: (detailPayload.labelIds ?? []).includes("UNREAD"),
        starred: (detailPayload.labelIds ?? []).includes("STARRED")
      } satisfies MailboxPreviewMessage;
    })
  );

  const previewItems = details.filter((item): item is MailboxPreviewMessage => Boolean(item));

  await updatePlatformSettings((current) => ({
    ...current,
    triageMailbox: {
      ...current.triageMailbox,
      inboundSync: "connected"
    },
    updatedAt: new Date().toISOString()
  }));

  return previewItems;
}

export async function listGoogleMailboxMessages(limit = 20, query = "in:inbox"): Promise<MailboxPreviewMessage[]> {
  const page = await listGoogleMailboxPage(limit, query);
  return page.items;
}

export async function listGoogleMailboxPage(
  limit = 20,
  query = "in:inbox",
  pageToken?: string
): Promise<MailboxListPage> {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    return { items: [] };
  }

  const params = new URLSearchParams({
    maxResults: String(Math.max(1, Math.min(limit, 50))),
    q: query
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const listResponse = await fetch(`${GMAIL_API_BASE}/messages?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!listResponse.ok) {
    throw new Error("Unable to fetch mailbox message list.");
  }

  const listPayload = (await listResponse.json()) as {
    messages?: Array<{ id?: string }>;
    nextPageToken?: string;
  };
  const messageIds = (listPayload.messages ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));

  const details = await Promise.all(
    messageIds.map(async (messageId) => {
      const detailResponse = await fetch(
        `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      if (!detailResponse.ok) {
        return null;
      }

      const detailPayload = (await detailResponse.json()) as {
        id?: string;
        snippet?: string;
        labelIds?: string[];
        payload?: {
          headers?: Array<{ name?: string; value?: string }>;
        };
      };

      return {
        id: detailPayload.id ?? messageId,
        subject: getHeaderValue(detailPayload.payload?.headers, "Subject") || "(No subject)",
        from: getHeaderValue(detailPayload.payload?.headers, "From") || "(Unknown sender)",
        date: getHeaderValue(detailPayload.payload?.headers, "Date") || "",
        snippet: detailPayload.snippet ?? "",
        unread: (detailPayload.labelIds ?? []).includes("UNREAD"),
        starred: (detailPayload.labelIds ?? []).includes("STARRED")
      } satisfies MailboxPreviewMessage;
    })
  );

  const items = details.filter((item): item is MailboxPreviewMessage => Boolean(item));

  await updatePlatformSettings((current) => ({
    ...current,
    triageMailbox: {
      ...current.triageMailbox,
      inboundSync: "connected"
    },
    updatedAt: new Date().toISOString()
  }));

  return {
    items,
    nextPageToken: listPayload.nextPageToken || undefined
  };
}

export async function getGoogleMailboxMessageById(messageId: string): Promise<MailboxMessageDetail | null> {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    id?: string;
    threadId?: string;
    snippet?: string;
    labelIds?: string[];
    payload?: {
      headers?: Array<{ name?: string; value?: string }>;
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<any>;
    };
  };

  const extracted = extractBodyParts(payload.payload);
  const fallbackText = decodeBase64Url(payload.payload?.body?.data);
  const textBody = extracted.textBody.trim() || fallbackText.trim();
  const htmlBody = extracted.htmlBody.trim();

  return {
    id: payload.id ?? messageId,
    threadId: payload.threadId,
    subject: getHeaderValue(payload.payload?.headers, "Subject") || "(No subject)",
    from: getHeaderValue(payload.payload?.headers, "From") || "(Unknown sender)",
    to: getHeaderValue(payload.payload?.headers, "To") || "",
    date: getHeaderValue(payload.payload?.headers, "Date") || "",
    messageId: getHeaderValue(payload.payload?.headers, "Message-Id") || "",
    snippet: payload.snippet ?? "",
    textBody,
    htmlBody: htmlBody || undefined,
    unread: (payload.labelIds ?? []).includes("UNREAD"),
    starred: (payload.labelIds ?? []).includes("STARRED")
  };
}

export async function sendGoogleMailboxMessage(input: MailboxDraftSendInput) {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    throw new Error("Google Mailbox is not connected yet.");
  }

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: buildRawEmail(input),
      threadId: input.threadId
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Unable to send mailbox message. ${payload}`);
  }

  return (await response.json()) as { id?: string; threadId?: string };
}

export async function trashGoogleMailboxMessage(messageId: string) {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    throw new Error("Google Mailbox is not connected yet.");
  }

  const response = await fetch(`${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}/trash`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Unable to move message to trash. ${payload}`);
  }

  return (await response.json()) as { id?: string };
}

export async function setGoogleMailboxFlag(messageId: string, flagged: boolean) {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    throw new Error("Google Mailbox is not connected yet.");
  }

  const response = await fetch(`${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      addLabelIds: flagged ? ["STARRED"] : [],
      removeLabelIds: flagged ? [] : ["STARRED"]
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Unable to update message flag. ${payload}`);
  }

  return (await response.json()) as { id?: string };
}

export async function listGoogleMailboxContacts(limit = 25, query = ""): Promise<MailboxContact[]> {
  const accessToken = await getValidGoogleMailboxAccessToken();
  if (!accessToken) {
    return [];
  }

  const pageSize = Math.max(5, Math.min(limit, 100));
  const response = await fetch(
    `${GOOGLE_PEOPLE_BASE}/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=${pageSize}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Unable to fetch contacts. ${payload}`);
  }

  const payload = (await response.json()) as {
    connections?: Array<{
      resourceName?: string;
      names?: Array<{ displayName?: string }>;
      emailAddresses?: Array<{ value?: string }>;
      phoneNumbers?: Array<{ value?: string }>;
    }>;
  };

  const contacts: MailboxContact[] = [];
  for (const entry of payload.connections ?? []) {
    const email = entry.emailAddresses?.find((item) => item.value?.trim())?.value?.trim() ?? "";
    if (!email) {
      continue;
    }
    const phone = entry.phoneNumbers?.find((item) => item.value?.trim())?.value?.trim();
    contacts.push({
      id: entry.resourceName ?? email.toLowerCase(),
      name: entry.names?.find((item) => item.displayName?.trim())?.displayName?.trim() ?? email,
      email,
      ...(phone ? { phone } : {})
    });
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return contacts.slice(0, pageSize);
  }

  return contacts
    .filter((item) =>
      [item.name, item.email, item.phone ?? ""].join(" ").toLowerCase().includes(normalizedQuery)
    )
    .slice(0, pageSize);
}
