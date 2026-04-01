import { cookies } from "next/headers";
import { createHash, createHmac, randomUUID } from "node:crypto";
import type { ActiveSession, Role, SessionUser } from "@/types/domain";
import { readPlatformControlCenter, readPlatformSettings, updatePlatformControlCenter } from "@/lib/platform-store";

const SESSION_COOKIE = "communite_session";
const DEFAULT_SESSION_SECRET = "communit-e-dev-session-secret";

type SessionPayload = {
  sessionId: string;
  email: string;
  role: Role;
  name: string;
  id: string;
};

function getSessionSecret() {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return DEFAULT_SESSION_SECRET;
}

function encodeSessionPayload(payload: SessionPayload) {
  const serialized = JSON.stringify(payload);
  const encoded = Buffer.from(serialized, "utf8").toString("base64url");
  const signature = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function decodeSessionPayload(value: string): SessionPayload | null {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  if (expected !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!parsed.sessionId || !parsed.email || !parsed.role || !parsed.name || !parsed.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseSessionCookie(value: string): SessionPayload | null {
  const signedPayload = decodeSessionPayload(value);
  if (signedPayload) {
    return signedPayload;
  }

  const [sessionId, email, role, name, id] = value.split("|");
  if (!sessionId || !email || !role || !name || !id) {
    return null;
  }

  return {
    sessionId,
    email,
    role: role as Role,
    name,
    id
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE);
  if (!session?.value) {
    return null;
  }

  const parsed = parseSessionCookie(session.value);
  if (!parsed) {
    return null;
  }
  const { sessionId, email, role, name, id } = parsed;

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
  store.set(
    SESSION_COOKIE,
    encodeSessionPayload({
      sessionId,
      email: user.email,
      role: user.role,
      name: user.name,
      id: user.id
    }),
    {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  }
  );
}

export async function clearSessionUser() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE);
  const parsed = session?.value ? parseSessionCookie(session.value) : null;
  const sessionId = parsed?.sessionId;
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
