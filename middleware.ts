import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RatePolicy = {
  limit: number;
  windowMs: number;
};

type RateRecord = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateRecord>();

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRatePolicy(pathname: string): RatePolicy | null {
  if (pathname === "/api/public/join") {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_JOIN_RATE_LIMIT, 20),
      windowMs: parsePositiveInt(process.env.PUBLIC_JOIN_RATE_WINDOW_SECONDS, 15 * 60) * 1000
    };
  }

  if (pathname === "/api/public/config") {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_CONFIG_RATE_LIMIT, 120),
      windowMs: parsePositiveInt(process.env.PUBLIC_CONFIG_RATE_WINDOW_SECONDS, 5 * 60) * 1000
    };
  }

  if (pathname.startsWith("/public-dashboard")) {
    return {
      limit: parsePositiveInt(process.env.PUBLIC_DASHBOARD_RATE_LIMIT, 300),
      windowMs: parsePositiveInt(process.env.PUBLIC_DASHBOARD_RATE_WINDOW_SECONDS, 5 * 60) * 1000
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
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000)
    };
  }

  if (current.count >= policy.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  rateBuckets.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function isLikelyAutomatedUserAgent(userAgent: string) {
  const lowered = userAgent.toLowerCase();
  return [
    "curl",
    "wget",
    "python-requests",
    "httpclient",
    "aiohttp",
    "scrapy",
    "bot/",
    "headless",
    "phantomjs",
    "selenium",
    "playwright",
    "postmanruntime"
  ].some((token) => lowered.includes(token));
}

function getAllowedOrigins() {
  const configured = (process.env.PUBLIC_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:3010",
    "https://www.unityincommunity.org.za",
    "https://unityincommunity.org.za"
  ];

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    defaults.push(appUrl);
  }

  return new Set([...defaults, ...configured]);
}

function blockedResponse(request: NextRequest, status: number, message: string, retryAfterSeconds?: number) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  if (isApi) {
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined
      }
    );
  }

  return new NextResponse(message, {
    status,
    headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined
  });
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const clientIp = getClientIp(request);

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
      const allowedOrigins = getAllowedOrigins();
      if (!allowedOrigins.has(origin)) {
        return blockedResponse(request, 403, "Untrusted origin.");
      }
    }
  }

  const policy = getRatePolicy(pathname);
  if (policy) {
    const key = `${pathname}:${clientIp}`;
    const result = applyRateLimit(key, policy);
    if (!result.allowed) {
      return blockedResponse(request, 429, "Too many requests. Please try again shortly.", result.retryAfterSeconds);
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
  matcher: ["/public-dashboard/:path*", "/api/public/join", "/api/public/config"]
};
