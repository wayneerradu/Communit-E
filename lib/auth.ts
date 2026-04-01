import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import type { ActiveSession, Role, SessionUser } from "@/types/domain";
import { readPlatformControlCenter, readPlatformSettings, updatePlatformControlCenter } from "@/lib/platform-store";

const SESSION_COOKIE = "communite_session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE);
  if (!session?.value) {
    return null;
  }

  const [sessionId, email, role, name, id] = session.value.split("|");
  if (!sessionId || !email || !role || !name || !id) {
    return null;
  }

  const controlCenter = await readPlatformControlCenter();
  const trackedSession = controlCenter.activeSessions.find((entry) => entry.id === sessionId);

  if (!trackedSession || trackedSession.status === "revoked") {
    return null;
  }

  if (new Date(trackedSession.expiresAt).getTime() <= Date.now()) {
    await revokeSession(sessionId);
    return null;
  }

  await touchSession(sessionId);

  return {
    email,
    role: role as Role,
    name,
    id
  };
}

export async function setSessionUser(user: SessionUser, userAgent?: string) {
  const settings = await readPlatformSettings();
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + settings.sessionPolicy.absoluteSessionHours * 60 * 60 * 1000);

  const newSession: ActiveSession = {
    id: sessionId,
    userEmail: user.email,
    userName: user.name,
    role: user.role,
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "active",
    userAgent
  };

  await updatePlatformControlCenter((current) => {
    const sessions = settings.sessionPolicy.allowMultipleSessions
      ? current.activeSessions
      : current.activeSessions.filter((session) => session.userEmail !== user.email);

    return {
      ...current,
      activeSessions: [...sessions, newSession]
    };
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, [sessionId, user.email, user.role, user.name, user.id].join("|"), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
}

export async function clearSessionUser() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE);
  const sessionId = session?.value.split("|")[0];
  if (sessionId) {
    await revokeSession(sessionId);
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeSession(sessionId: string) {
  await updatePlatformControlCenter((current) => ({
    ...current,
    activeSessions: current.activeSessions.map((session) =>
      session.id === sessionId ? { ...session, status: "revoked" } : session
    )
  }));
}

export async function touchSession(sessionId: string) {
  const settings = await readPlatformSettings();
  await updatePlatformControlCenter((current) => ({
    ...current,
    activeSessions: current.activeSessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + settings.sessionPolicy.absoluteSessionHours * 60 * 60 * 1000);

      return {
        ...session,
        lastActivityAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: "active"
      };
    })
  }));
}

export async function revokeAllSessionsForUser(userEmail: string) {
  await updatePlatformControlCenter((current) => ({
    ...current,
    activeSessions: current.activeSessions.map((session) =>
      session.userEmail === userEmail ? { ...session, status: "revoked" } : session
    )
  }));
}

export async function getTrackedSessions() {
  const controlCenter = await readPlatformControlCenter();
  return controlCenter.activeSessions;
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, expectedHash: string) {
  return hashPassword(password) === expectedHash;
}
