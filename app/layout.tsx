import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommUNIT-E",
  description: "Community operations platform for residents, admins, and PRO teams.",
  applicationName: "CommUNIT-E",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CommUNIT-E"
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0f6671"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
