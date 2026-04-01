import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSessionUser } from "@/lib/auth";
import { isAllowedWorkspaceEmail } from "@/lib/identity";
import { writeGoogleCalendarConnection } from "@/lib/google-calendar-store";
import { readGoogleMailboxConnection, writeGoogleMailboxConnection } from "@/lib/google-mailbox-store";
import { readPlatformSettings, updatePlatformSettings } from "@/lib/platform-store";
import { upsertWorkspaceUser } from "@/lib/users";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = await readPlatformSettings();
  const appBaseUrl = process.env.APP_URL?.trim() || url.origin;
  const redirectTargetBase = new URL(appBaseUrl);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const savedState = store.get("google_oauth_state")?.value;
  const oauthPurpose = store.get("google_oauth_purpose")?.value ?? "workspace";

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/super-admin?google=error&reason=${encodeURIComponent(error)}`, redirectTargetBase));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/dashboard/super-admin?google=invalid-state", redirectTargetBase));
  }

  store.delete("google_oauth_state");
  store.delete("google_oauth_purpose");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    settings.googleWorkspace.callbackUrl ??
    `${appBaseUrl.replace(/\/+$/, "")}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard/super-admin?google=config-missing", redirectTargetBase));
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL("/dashboard/super-admin?google=token-error", redirectTargetBase));
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!tokenPayload.access_token) {
      return NextResponse.redirect(new URL("/dashboard/super-admin?google=missing-access-token", redirectTargetBase));
    }

    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`
      }
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL("/dashboard/super-admin?google=userinfo-error", redirectTargetBase));
    }

    const userPayload = (await userResponse.json()) as { email?: string; name?: string };
    if (!userPayload.email || !isAllowedWorkspaceEmail(userPayload.email)) {
      return NextResponse.redirect(new URL("/dashboard/super-admin?google=forbidden-domain", redirectTargetBase));
    }
    const connectedEmail = userPayload.email;

    if (oauthPurpose === "calendar") {
      const scopes = (tokenPayload.scope ?? "")
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean);

      if (tokenPayload.refresh_token) {
        await writeGoogleCalendarConnection({
          connectedAccount: connectedEmail,
          accessToken: tokenPayload.access_token,
          refreshToken: tokenPayload.refresh_token,
          expiresAt: new Date(Date.now() + (tokenPayload.expires_in ?? 3600) * 1000).toISOString(),
          scopes
        });
      }

      await updatePlatformSettings((current) => ({
        ...current,
        googleCalendar: {
          ...current.googleCalendar,
          connectedAccount: connectedEmail,
          grantedScopes: scopes.length > 0 ? scopes : current.googleCalendar.grantedScopes,
          refreshTokenConfigured: Boolean(tokenPayload.refresh_token) || current.googleCalendar.refreshTokenConfigured,
          connectionStatus: (Boolean(tokenPayload.refresh_token) || current.googleCalendar.refreshTokenConfigured) ? "connected" : "pending",
          lastSyncedAt: current.googleCalendar.lastSyncedAt
        },
        updatedAt: new Date().toISOString()
      }));

      return NextResponse.redirect(new URL("/dashboard/super-admin?google-calendar=connected", redirectTargetBase));
    }

    if (oauthPurpose === "mailbox") {
      const scopes = (tokenPayload.scope ?? "")
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean);
      const existingMailboxConnection = await readGoogleMailboxConnection();
      const refreshTokenToUse = tokenPayload.refresh_token ?? existingMailboxConnection?.refreshToken;

      if (refreshTokenToUse) {
        await writeGoogleMailboxConnection({
          connectedAccount: connectedEmail,
          accessToken: tokenPayload.access_token,
          refreshToken: refreshTokenToUse,
          expiresAt: new Date(Date.now() + (tokenPayload.expires_in ?? 3600) * 1000).toISOString(),
          scopes
        });
      }

      await updatePlatformSettings((current) => ({
        ...current,
        triageMailbox: {
          ...current.triageMailbox,
          address: connectedEmail,
          inboundSync: (Boolean(refreshTokenToUse) || current.triageMailbox.inboundSync === "connected")
            ? "connected"
            : "planned"
        },
        updatedAt: new Date().toISOString()
      }));

      return NextResponse.redirect(new URL("/dashboard/super-admin?google-mailbox=connected", redirectTargetBase));
    }

    const sessionUser = await upsertWorkspaceUser(connectedEmail, userPayload.name);
    await setSessionUser(sessionUser, request.headers.get("user-agent") ?? undefined);

    return NextResponse.redirect(new URL("/dashboard?google=connected", redirectTargetBase));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/super-admin?google=callback-failed", redirectTargetBase));
  }
}
