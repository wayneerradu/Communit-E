import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { readPlatformSettings } from "@/lib/platform-store";
import { getAllowedWorkspaceDomain } from "@/lib/identity";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const settings = await readPlatformSettings();
  const clientId = process.env.GOOGLE_CLIENT_ID ?? settings.googleWorkspace.clientId;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? settings.googleWorkspace.callbackUrl;
  const workspaceDomain = process.env.ALLOWED_WORKSPACE_DOMAIN ?? settings.googleWorkspace.workspaceDomain ?? getAllowedWorkspaceDomain();

  if (!clientId || clientId === "google-client-id-placeholder") {
    return NextResponse.json(
      { error: "Google Client ID is not configured yet." },
      { status: 400 }
    );
  }

  const state = randomBytes(16).toString("hex");
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
  const purposeParam = url.searchParams.get("purpose");
  const purpose = purposeParam === "calendar" || purposeParam === "mailbox" ? purposeParam : "workspace";
  cookieStore.set("google_oauth_purpose", purpose, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });

  const requestedScopes =
    purpose === "calendar"
      ? ["openid", "email", "profile", ...settings.googleCalendar.grantedScopes]
      : purpose === "mailbox"
        ? [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/contacts.readonly"
          ]
      : ["openid", "email", "profile"];
  const scope = Array.from(new Set(requestedScopes)).join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
    hd: workspaceDomain
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  return NextResponse.json({
    ok: true,
    url: authUrl,
    message: "Google OAuth request prepared. Finish the sign-in in the opened browser window."
  });
}
