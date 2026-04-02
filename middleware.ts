import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type RatePolicy = {
  limit: number;
  windowMs: number;
};

type RateRecord = {
  count: number;
  resetAt: number;
};

// ─── In-memory rate limiter ───────────────────────────────────────────────────

const rateBuckets = new Map<string, RateRecord>();

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRatePolicy(pathname: string): RatePolicy | null {
  if (pathname === "/api/auth/login") {
    return {
      limit: parsePositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT, 20),
      windowMs: parsePositiveInt(process.env.AUTH_LOGIN_RATE_WINDOW_SECONDS, 15 * 60) * 1000,
    };
  }

  if (
    pathname === "/api/auth/forgot-password" ||
    pathname === "/api/auth/reset-password"
  ) {
    return {
      limit: parsePositiveInt(process.env.AUTH_PASSWORD_RATE_LIMIT, 15),
      windowMs: parsePositiveInt(process.env.AUTH_PASSWORD_RATE_WINDOW_SECONDS, 15 * 60) * 1000,
    };
  }

  if (pathname === "/api/public/join") {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_JOIN_RATE_LIMIT, 20),
      windowMs: parsePositiveInt(process.env.PUBLIC_JOIN_RATE_WINDOW_SECONDS, 15 * 60) * 1000,
    };
  }

  if (pathname === "/api/public/config") {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_CONFIG_RATE_LIMIT, 120),
      windowMs: parsePositiveInt(process.env.PUBLIC_CONFIG_RATE_WINDOW_SECONDS, 5 * 60) * 1000,
    };
  }

  if (pathname.startsWith("/public-dashboard")) {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_DASHBOARD_RATE_LIMIT, 300),
      windowMs: parsePositiveInt(process.env.PUBLIC_DASHBOARD_RATE_WINDOW_SECONDS, 5 * 60) * 1000,
    };
  }

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/jobs/")) {
    return {
      limit: parsePositiveInt(process.env.API_RATE_LIMIT, 300),
      windowMs: parsePositiveInt(process.env.API_RATE_WINDOW_SECONDS, 5 * 60) * 1000,
    };
  }

  return null;
}

function applyRateLimit(key: string, policy: RatePolicy) {
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || now >= current.resetAt) {
    const next: RateRecord = { count: 1, resetAt: now + policy.windowMs };
    rateBuckets.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, policy.limit - next.count),
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
    };
  }

  if (current.count >= policy.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  rateBuckets.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip")?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

function isLikelyAutomatedUserAgent(userAgent: string) {
  const lowered = userAgent.toLowerCase();
  return [
    "curl", "wget", "python-requests", "httpclient", "aiohttp",
    "scrapy", "bot/", "headless", "phantomjs", "selenium",
    "playwright", "postmanruntime",
  ].some((token) => lowered.includes(token));
}

function getAllowedOrigins(runtimeOrigin?: string) {
  const configured = (process.env.PUBLIC_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:3010",
    "https://www.unityincommunity.org.za",
    "https://unityincommunity.org.za",
  ];

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) defaults.push(appUrl);
  if (runtimeOrigin) defaults.push(runtimeOrigin);

  return new Set([...defaults, ...configured]);
}

function blockedResponse(
  request: NextRequest,
  status: number,
  message: string,
  retryAfterSeconds?: number
) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const headers: HeadersInit = retryAfterSeconds
    ? { "Retry-After": String(retryAfterSeconds) }
    : {};

  if (isApi) {
    return NextResponse.json({ error: message }, { status, headers });
  }
  return new NextResponse(message, { status, headers });
}

function isMutationMethod(method: string) {
  return (
    method === "POST" ||
    method === "PATCH" ||
    method === "PUT" ||
    method === "DELETE"
  );
}

function isCsrfExemptPath(pathname: string) {
  return pathname.startsWith("/api/jobs/");
}

function getOriginFromReferer(referer: string | null) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

// ─── Session cookie reader (edge-safe, no DB call) ───────────────────────────
// We only check for the presence + basic validity of the signed session cookie
// here in middleware — the full session validation (DB lookup, expiry check)
// happens inside getSessionUser() in each API/page handler as before.

const SESSION_COOKIE = "communite_session";

function hasValidSessionCookie(request: NextRequest): boolean {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return false;

  // Cookie format: <base64url-payload>.<hmac-signature>
  // Accept both the signed format and the legacy pipe-delimited format.
  const value = cookie.value;
  const hasDot = value.includes(".");
  const hasPipe = value.includes("|");
  return hasDot || hasPipe;
}

// ─── Route classification ─────────────────────────────────────────────────────

// Public API routes that do NOT require authentication.
const PUBLIC_API_PREFIXES = [
  "/api/auth/",          // login, logout, google oauth, reset password
  "/api/public/",        // join form, public config
  "/api/time/",          // SAST time (used by public dashboard)
  "/api/faults",         // GET is used by public dashboard — auth checked per-handler
  "/api/jobs/",          // internal automation jobs (exempt from CSRF + auth)
  "/api/platform/client-config", // used before login
];

function isPublicApiRoute(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const clientIp = getClientIp(request);

  // ── 1. Dashboard route protection ─────────────────────────────────────────
  // Any request to /dashboard/** that lacks a valid session cookie is
  // immediately redirected to /login. Full session validation still happens
  // inside the dashboard layout via getSessionUser().
  if (pathname.startsWith("/dashboard")) {
    if (!hasValidSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 2. Authenticated API route protection ─────────────────────────────────
  // Any /api/** route that is not in the public whitelist requires a session
  // cookie. Return 401 if missing so client-side code can redirect to login.
  if (pathname.startsWith("/api/") && !isPublicApiRoute(pathname)) {
    if (!hasValidSessionCookie(request)) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
  }

  // ── 3. Public join form protection ────────────────────────────────────────
  if (pathname === "/api/public/join") {
    if (method !== "POST") {
      return blockedResponse(request, 405, "Method not allowed.");
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent || isLikelyAutomatedUserAgent(userAgent)) {
      return blockedResponse(request, 403, "Request blocked.");
    }

    const origin = request.headers.get("origin");
    if (origin) {
      const allowedOrigins = getAllowedOrigins(request.nextUrl.origin);
      if (!allowedOrigins.has(origin)) {
        return blockedResponse(request, 403, "Untrusted origin.");
      }
    }
  }

  // ── 4. CSRF protection for all mutating API calls ─────────────────────────
  if (
    pathname.startsWith("/api/") &&
    isMutationMethod(method) &&
    !isCsrfExemptPath(pathname)
  ) {
    const allowedOrigins = getAllowedOrigins(request.nextUrl.origin);
    const origin = request.headers.get("origin")?.trim() ?? null;
    const refererOrigin = getOriginFromReferer(request.headers.get("referer"));
    const sourceOrigin = origin ?? refererOrigin;

    if (!sourceOrigin || !allowedOrigins.has(sourceOrigin)) {
      return blockedResponse(request, 403, "CSRF protection blocked this request.");
    }
  }

  // ── 5. Rate limiting ──────────────────────────────────────────────────────
  const policy = getRatePolicy(pathname);
  if (policy) {
    const key = `${pathname}:${clientIp}`;
    const result = applyRateLimit(key, policy);

    if (!result.allowed) {
      return blockedResponse(
        request,
        429,
        "Too many requests. Please try again shortly.",
        result.retryAfterSeconds
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(policy.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.retryAfterSeconds));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/public-dashboard/:path*", "/api/:path*"],
};
