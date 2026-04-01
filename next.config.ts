import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    const publicDashboardHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'self' https://www.unityincommunity.org.za https://unityincommunity.org.za",
          "base-uri 'self'",
          "form-action 'none'",
          "object-src 'none'",
          "upgrade-insecure-requests"
        ].join("; ")
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin"
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff"
      },
      {
        key: "X-Permitted-Cross-Domain-Policies",
        value: "none"
      },
      {
        key: "Permissions-Policy",
        value:
          "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "same-origin"
      }
    ];

    return [
      {
        source: "/public-dashboard",
        headers: publicDashboardHeaders
      },
      {
        source: "/public-dashboard/:path*",
        headers: publicDashboardHeaders
      }
    ];
  }
};

export default nextConfig;
