"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppNotification, SessionUser, UserProfile } from "@/types/domain";
import { cn } from "@/lib/utils";

const navItems: Array<{ href: string; label: string; superAdminOnly?: boolean }> = [
  { href: "/dashboard/my-profile", label: "My Profile" },
  { href: "/dashboard/faults", label: "Faults Hub" },
  { href: "/dashboard/projects", label: "Projects Hub" },
  { href: "/dashboard/pro", label: "PRO Hub" },
  { href: "/dashboard/hello-inbox", label: "Hello Inbox" },
  { href: "/dashboard/vault", label: "Vault" },
  { href: "/dashboard/help", label: "Self Help ?" },
  { href: "/dashboard/notifications", label: "Notification Center" },
  { href: "/dashboard/super-admin", label: "⚙ Settings", superAdminOnly: true }
];

function getHelpTarget(pathname: string) {
  if (pathname === "/dashboard") return { category: "admin", query: "Overview" };
  if (pathname === "/dashboard/my-work") return { category: "admin", query: "My Work" };

  if (pathname === "/dashboard/residents") return { category: "residents", query: "Overview" };
  if (pathname === "/dashboard/residents/map") return { category: "residents", query: "Residents Map" };

  if (pathname === "/dashboard/faults") return { category: "faults", query: "Overview" };
  if (pathname === "/dashboard/faults/log") return { category: "faults", query: "Escalate Fault" };
  if (pathname === "/dashboard/faults/register") return { category: "faults", query: "Fault Queue" };
  if (pathname === "/dashboard/faults/map") return { category: "faults", query: "Fault Map" };
  if (pathname === "/dashboard/faults/assigned") return { category: "faults", query: "Assigned to Me" };
  if (pathname === "/dashboard/faults/escalations") return { category: "faults", query: "Escalations" };
  if (pathname === "/dashboard/faults/closed") return { category: "faults", query: "Closed Faults" };
  if (pathname === "/dashboard/faults/settings") return { category: "faults", query: "Fault Settings" };

  if (pathname === "/dashboard/infrastructure") return { category: "infrastructure", query: "Overview" };
  if (pathname === "/dashboard/infrastructure/map") return { category: "infrastructure", query: "Infrastructure Map" };

  if (pathname === "/dashboard/projects") return { category: "projects", query: "Manager" };
  if (pathname === "/dashboard/projects/overview") return { category: "projects", query: "Overview" };
  if (pathname === "/dashboard/projects/manager") return { category: "projects", query: "Manager" };
  if (pathname === "/dashboard/projects/my-projects-tasks") return { category: "projects", query: "My Projects And Tasks" };
  if (pathname === "/dashboard/projects/reporting") return { category: "projects", query: "Reporting" };

  if (pathname === "/dashboard/pro") return { category: "pro", query: "PlayGround" };
  if (pathname === "/dashboard/pro/donors") return { category: "pro", query: "Donors" };

  if (pathname === "/dashboard/meetings/scheduler") return { category: "meetings", query: "Meeting Scheduler" };
  if (pathname === "/dashboard/meetings") return { category: "meetings", query: "Meeting Minuter" };
  if (pathname === "/dashboard/resolutions") return { category: "meetings", query: "Resolutions" };
  if (pathname === "/dashboard/parking-lot") return { category: "meetings", query: "Parking Lot" };

  if (pathname === "/dashboard/my-profile") return { category: "profile", query: "My Profile" };
  if (pathname === "/dashboard/hello-inbox") return { category: "admin", query: "Hello Inbox" };
  if (pathname === "/dashboard/notifications") return { category: "admin", query: "Notification Center" };
  if (pathname === "/dashboard/vault") return { category: "admin", query: "Vault" };
  if (pathname === "/dashboard/help") return { category: "admin", query: "Help Center" };
  if (pathname === "/dashboard/super-admin") return { category: "super-admin", query: "Super Admin" };
  if (pathname === "/dashboard/super-admin/communication-settings") return { category: "super-admin", query: "Communication Settings" };
  if (pathname === "/dashboard/super-admin/identity-access") return { category: "super-admin", query: "Identity & Access" };
  if (pathname === "/dashboard/super-admin/mailbox-calendar") return { category: "super-admin", query: "Mailbox & Calendar" };
  if (pathname === "/dashboard/super-admin/public-security") return { category: "super-admin", query: "Public & Security" };
  if (pathname === "/dashboard/super-admin/branding-platform") return { category: "super-admin", query: "Branding & Platform" };
  if (pathname === "/dashboard/super-admin/operations-reliability") return { category: "super-admin", query: "Operations & Reliability" };
  if (pathname === "/dashboard/super-admin/governance-audit") return { category: "super-admin", query: "Governance & Audit" };

  if (pathname.startsWith("/dashboard/residents")) return { category: "residents", query: "Find a Resident" };
  if (pathname.startsWith("/dashboard/faults")) return { category: "faults", query: "Fault Queue" };
  if (pathname.startsWith("/dashboard/projects")) return { category: "projects", query: "Manager" };
  if (pathname.startsWith("/dashboard/pro")) return { category: "pro", query: "PlayGround" };
  if (pathname.startsWith("/dashboard/infrastructure")) return { category: "infrastructure", query: "Overview" };
  if (pathname.startsWith("/dashboard/meetings")) return { category: "meetings", query: "Meeting Minuter" };

  return { category: "admin", query: "Overview" };
}

export function AppShell({
  children,
  user,
  teamProfiles,
  notifications,
  platformSubtitle,
  logoImage,
  organisationName,
  communicationModes
}: {
  children: React.ReactNode;
  user: SessionUser;
  teamProfiles: UserProfile[];
  notifications: AppNotification[];
  platformSubtitle: string;
  logoImage: string;
  organisationName: string;
  communicationModes: {
    email: "off" | "live" | "demo";
    telegram: "off" | "live" | "demo";
  };
}) {
  type WeatherSnapshot = {
    location: string;
    temperatureC: number | null;
    apparentTempC?: number | null;
    weatherLabel: string;
    humidity?: number | null;
    windSpeedKmh?: number | null;
    windGustKmh?: number | null;
    rainChanceToday?: number | null;
    rainfallTodayMm?: number | null;
    uvIndexMaxToday?: number | null;
    sunriseToday?: string | null;
    sunsetToday?: string | null;
    airQuality?: {
      usAqi: number | null;
      label: string;
    };
    tomorrowForecast?: {
      date: string | null;
      weatherLabel: string;
      maxC: number | null;
      minC: number | null;
    };
    severeAlert?: string | null;
    warnings: string[];
    fetchedAt?: string;
    error?: string;
  };
  const currentPath = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarImage, setAvatarImage] = useState(user.avatarImage ?? "");
  const [currentStatus, setCurrentStatus] = useState(user.status ?? "active");
  const [notificationFeed, setNotificationFeed] = useState(notifications);
  const [isPresenceDrawerOpen, setIsPresenceDrawerOpen] = useState(false);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState(false);
  const [helpHostElement, setHelpHostElement] = useState<HTMLElement | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [clockTick, setClockTick] = useState(0);
  const [isClockReady, setIsClockReady] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherRotationIndex, setWeatherRotationIndex] = useState(0);
  const presenceDrawerRef = useRef<HTMLElement | null>(null);
  const presenceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const notificationsDrawerRef = useRef<HTMLElement | null>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const createdHelpHostRef = useRef<HTMLElement | null>(null);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(
    currentPath === "/dashboard" || currentPath === "/dashboard/my-work"
  );
  const [isResidentsHubOpen, setIsResidentsHubOpen] = useState(currentPath.startsWith("/dashboard/residents"));
  const [isFaultsHubOpen, setIsFaultsHubOpen] = useState(currentPath.startsWith("/dashboard/faults"));
  const [isInfrastructureHubOpen, setIsInfrastructureHubOpen] = useState(
    currentPath.startsWith("/dashboard/infrastructure")
  );
  const [isProjectsHubOpen, setIsProjectsHubOpen] = useState(currentPath.startsWith("/dashboard/projects"));
  const [isMeetingsOpen, setIsMeetingsOpen] = useState(
    currentPath.startsWith("/dashboard/meetings") ||
      currentPath.startsWith("/dashboard/resolutions") ||
      currentPath.startsWith("/dashboard/parking-lot")
  );
  const [isProHubOpen, setIsProHubOpen] = useState(currentPath.startsWith("/dashboard/pro"));
  const visibleNavItems = navItems.filter((item) => !item.superAdminOnly || user.role === "SUPER_ADMIN");
  const profileHeading = currentPath === "/dashboard" || currentPath === "/dashboard/my-work" ? "Welcome" : "Operator Logged In";
  const showPresenceDrawer = !currentPath.startsWith("/dashboard/super-admin");
  const helpTarget = getHelpTarget(currentPath);
  const helpQuery = new URLSearchParams({
    category: helpTarget.category,
    q: helpTarget.query
  });
  const helpHref = `/dashboard/help?${helpQuery.toString()}` as Route;
  const statusOptions: Array<{ value: NonNullable<SessionUser["status"]>; label: string; tone: string }> = [
    { value: "active", label: "Active", tone: "success" },
    { value: "busy", label: "Busy", tone: "warning" },
    { value: "dnd", label: "DND", tone: "danger" },
    { value: "vacation", label: "On Vacation", tone: "default" },
    { value: "offline", label: "Offline", tone: "default" }
  ];

  useEffect(() => {
    if (currentPath === "/dashboard" || currentPath === "/dashboard/my-work") {
      setIsAdminDashboardOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.startsWith("/dashboard/residents")) {
      setIsResidentsHubOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.startsWith("/dashboard/faults")) {
      setIsFaultsHubOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.startsWith("/dashboard/infrastructure")) {
      setIsInfrastructureHubOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.startsWith("/dashboard/projects")) {
      setIsProjectsHubOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (
      currentPath.startsWith("/dashboard/meetings") ||
      currentPath.startsWith("/dashboard/resolutions") ||
      currentPath.startsWith("/dashboard/parking-lot")
    ) {
      setIsMeetingsOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.startsWith("/dashboard/pro")) {
      setIsProHubOpen(true);
    }
  }, [currentPath]);

  useEffect(() => {
    setAvatarImage(user.avatarImage ?? "");
  }, [user.avatarImage]);

  useEffect(() => {
    setCurrentStatus(user.status ?? "active");
  }, [user.status]);

  useEffect(() => {
    setNotificationFeed(notifications);
  }, [notifications]);

  useEffect(() => {
    function clearCreatedHelpHost() {
      if (!createdHelpHostRef.current) return;
      createdHelpHostRef.current.remove();
      createdHelpHostRef.current = null;
    }

    function resolveHelpHost() {
      const existingHost = document.querySelector(".page-header .dashboard-actions") as HTMLElement | null;
      if (existingHost) {
        clearCreatedHelpHost();
        setHelpHostElement(existingHost);
        return;
      }

      const header = document.querySelector(".page-header") as HTMLElement | null;
      if (!header) {
        clearCreatedHelpHost();
        setHelpHostElement(null);
        return;
      }

      let host = header.querySelector(".dashboard-actions.app-shell-help-host") as HTMLElement | null;
      if (!host) {
        host = document.createElement("div");
        host.className = "dashboard-actions app-shell-help-host";
        header.appendChild(host);
      }

      createdHelpHostRef.current = host;
      setHelpHostElement(host);
    }

    resolveHelpHost();
    const raf = window.requestAnimationFrame(resolveHelpHost);
    const timer = window.setTimeout(resolveHelpHost, 120);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      if (createdHelpHostRef.current) {
        createdHelpHostRef.current.remove();
        createdHelpHostRef.current = null;
      }
    };
  }, [currentPath]);

  useEffect(() => {
    if (!isPresenceDrawerOpen && !isNotificationsDrawerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (
        target
      ) {
        if (
          isPresenceDrawerOpen &&
          !presenceDrawerRef.current?.contains(target) &&
          !presenceTriggerRef.current?.contains(target)
        ) {
          setIsPresenceDrawerOpen(false);
        }

        if (
          isNotificationsDrawerOpen &&
          !notificationsDrawerRef.current?.contains(target) &&
          !notificationsTriggerRef.current?.contains(target)
        ) {
          setIsNotificationsDrawerOpen(false);
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPresenceDrawerOpen(false);
        setIsNotificationsDrawerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsDrawerOpen, isPresenceDrawerOpen]);

  useEffect(() => {
    let cancelled = false;

    async function refreshNotifications(autoRead: boolean) {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as { items: AppNotification[]; unreadCount: number };
        let nextItems = payload.items;

        if (autoRead && payload.unreadCount > 0) {
          const markResponse = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark-all-read" })
          });

          if (markResponse.ok && !cancelled) {
            const markPayload = (await markResponse.json()) as { items: AppNotification[] };
            nextItems = markPayload.items;
          }
        }

        if (!cancelled) {
          setNotificationFeed(nextItems);
        }
      } catch {
        // Ignore transient network failures while polling notifications.
      }
    }

    void refreshNotifications(isNotificationsDrawerOpen);

    const timer = window.setInterval(() => {
      void refreshNotifications(isNotificationsDrawerOpen);
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isNotificationsDrawerOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  async function updatePresenceStatus(status: NonNullable<SessionUser["status"]>) {
    setCurrentStatus(status);

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      router.refresh();
    } catch {
      // Keep local state even if persistence fails momentarily.
    }
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const currentUserDisplay = {
    fullName: user.name,
    email: user.email,
    avatarImage,
    status: currentStatus
  };

  const otherProfiles = teamProfiles.filter((profile) => profile.email.toLowerCase() !== user.email.toLowerCase());
  const normalizedEmail = user.email.trim().toLowerCase();
  const unreadNotifications = notificationFeed.filter((item) => !(item.readBy ?? []).includes(normalizedEmail)).length;
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  function toModeTone(mode: "off" | "live" | "demo") {
    if (mode === "live") return "success";
    if (mode === "demo") return "warning";
    return "danger";
  }

  const nowWithOffset = new Date(clockTick + clockOffsetMs);
  const sastDayName = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long"
  }).format(nowWithOffset);
  const sastDate = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(nowWithOffset);
  const sastTime = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(nowWithOffset);

  useEffect(() => {
    let cancelled = false;
    setIsClockReady(true);
    setClockTick(Date.now());

    async function syncSastClock() {
      try {
        const response = await fetch("/api/time/sast", { cache: "no-store" });
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as { epochMs: number };
        if (!cancelled && typeof payload.epochMs === "number") {
          setClockOffsetMs(payload.epochMs - Date.now());
        }
      } catch {
        // Keep local clock with previous offset if sync fails.
      }
    }

    void syncSastClock();
    const syncTimer = window.setInterval(() => {
      void syncSastClock();
    }, 10 * 60 * 1000);

    const tickTimer = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(syncTimer);
      window.clearInterval(tickTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshWeather() {
      try {
        const response = await fetch("/api/weather/mount-vernon", { cache: "no-store" });
        const payload = (await response.json()) as WeatherSnapshot;
        if (!cancelled) {
          setWeather(payload);
          setWeatherRotationIndex(0);
        }
      } catch {
        if (!cancelled) {
          setWeather({
            location: "Mount Vernon, Durban",
            temperatureC: null,
            weatherLabel: "Unavailable",
            warnings: [],
            error: "Weather service unavailable"
          });
        }
      }
    }

    void refreshWeather();
    const timer = window.setInterval(() => {
      void refreshWeather();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const weatherMessages = (() => {
    if (!weather) {
      return ["Loading weather..."];
    }

    const base = [
      weather.temperatureC !== null
        ? `Current Temperature: ${weather.temperatureC}°C`
        : "Current Temperature: --°C",
      weather.apparentTempC !== null && weather.apparentTempC !== undefined
        ? `Feels Like: ${weather.apparentTempC}°C`
        : "Feels Like: --°C",
      `Current Weather: ${weather.weatherLabel || "Unavailable"}`,
      weather.humidity !== null && weather.humidity !== undefined
        ? `Humidity: ${weather.humidity}%`
        : "Humidity: --%",
      weather.windSpeedKmh !== null && weather.windSpeedKmh !== undefined
        ? `Wind: ${weather.windSpeedKmh} km/h (Gust ${weather.windGustKmh ?? "--"} km/h)`
        : "Wind: --",
      weather.rainChanceToday !== null && weather.rainChanceToday !== undefined
        ? `Rain Chance Today: ${weather.rainChanceToday}%`
        : "Rain Chance Today: --",
      weather.rainfallTodayMm !== null && weather.rainfallTodayMm !== undefined
        ? `Rainfall Today: ${weather.rainfallTodayMm} mm`
        : "Rainfall Today: --",
      weather.uvIndexMaxToday !== null && weather.uvIndexMaxToday !== undefined
        ? `UV Index (Max): ${weather.uvIndexMaxToday}`
        : "UV Index (Max): --",
      weather.sunriseToday && weather.sunsetToday
        ? `Sunrise/Sunset: ${weather.sunriseToday} / ${weather.sunsetToday}`
        : "Sunrise/Sunset: --",
      weather.airQuality
        ? `Air Quality (US AQI): ${weather.airQuality.usAqi ?? "--"} (${weather.airQuality.label})`
        : "Air Quality (US AQI): --",
      weather.tomorrowForecast
        ? `Tomorrow: ${weather.tomorrowForecast.weatherLabel}${
            weather.tomorrowForecast.maxC !== null || weather.tomorrowForecast.minC !== null
              ? ` (${weather.tomorrowForecast.minC ?? "--"}°C to ${weather.tomorrowForecast.maxC ?? "--"}°C)`
              : ""
          }`
        : "Tomorrow: Forecast unavailable"
    ];

    const warningLines = weather.warnings.length > 0 ? weather.warnings.map((warning) => `Warning: ${warning}`) : [];
    const severeLine = weather.severeAlert ? [`Severe Alert: ${weather.severeAlert}`] : [];

    if (warningLines.length > 0 || severeLine.length > 0) {
      return [...base, ...severeLine, ...warningLines];
    }

    return base;
  })();

  const activeWeatherMessage = weatherMessages[weatherRotationIndex % weatherMessages.length];
  const isWarningMessage = activeWeatherMessage.toLowerCase().startsWith("warning:");

  useEffect(() => {
    if (weatherMessages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setWeatherRotationIndex((current) => (current + 1) % weatherMessages.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [weatherMessages.length]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-stack">
          <div className="brand-logo-shell">
            {logoImage ? (
              <Image
                src={logoImage}
                alt="CommUNIT-E logo"
                className="brand-logo-image"
                width={160}
                height={48}
                unoptimized
              />
            ) : (
              <div className="brand-logo-placeholder">CE</div>
            )}
          </div>
          <div className="brand-block">
            <h1>CommUNIT-E</h1>
            <p>{platformSubtitle}</p>
          </div>
          <div className="weather-live-banner sidebar-weather-banner" aria-live="polite">
            <strong>Mount Vernon Weather Live</strong>
            <span className={isWarningMessage ? "weather-live-warning" : ""}>{activeWeatherMessage}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-subnav sidebar-subnav-root">
            <Link
              className={cn("sidebar-sublink", currentPath === "/dashboard/my-profile" && "sidebar-sublink-active")}
              href={"/dashboard/my-profile" as Route}
            >
              My Profile
            </Link>
            <Link
              className={cn("sidebar-sublink", currentPath === "/dashboard/hello-inbox" && "sidebar-sublink-active")}
              href={"/dashboard/hello-inbox" as Route}
            >
              Hello Inbox
            </Link>
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                (currentPath === "/dashboard" || currentPath === "/dashboard/my-work") && "sidebar-link-active"
              )}
              onClick={() => setIsAdminDashboardOpen((current) => !current)}
              aria-expanded={isAdminDashboardOpen}
            >
              <span>Admin Dashboard</span>
              <span className={cn("sidebar-caret", isAdminDashboardOpen && "sidebar-caret-open")}>
                {isAdminDashboardOpen ? "−" : "+"}
              </span>
            </button>
            {isAdminDashboardOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard" && "sidebar-sublink-active")}
                  href={"/dashboard" as Route}
                >
                  Overview
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/my-work" && "sidebar-sublink-active")}
                  href={"/dashboard/my-work" as Route}
                >
                  My Work
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/faults") && "sidebar-link-active"
              )}
              onClick={() => setIsFaultsHubOpen((current) => !current)}
              aria-expanded={isFaultsHubOpen}
            >
              <span>Faults Hub</span>
              <span className={cn("sidebar-caret", isFaultsHubOpen && "sidebar-caret-open")}>
                {isFaultsHubOpen ? "−" : "+"}
              </span>
            </button>
            {isFaultsHubOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults" && "sidebar-sublink-active")}
                  href={"/dashboard/faults" as Route}
                >
                  Overview
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/log" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/log" as Route}
                >
                  Escalate Fault
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/register" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/register" as Route}
                >
                  Fault Queue
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/map" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/map" as Route}
                >
                  Fault Map
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/assigned" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/assigned" as Route}
                >
                  Assigned to Me
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/escalations" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/escalations" as Route}
                >
                  Escalations
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/faults/closed" && "sidebar-sublink-active")}
                  href={"/dashboard/faults/closed" as Route}
                >
                  Closed Faults
                </Link>
                {user.role === "SUPER_ADMIN" ? (
                  <Link
                    className={cn("sidebar-sublink", currentPath === "/dashboard/faults/settings" && "sidebar-sublink-active")}
                    href={"/dashboard/faults/settings" as Route}
                  >
                    ⚙ Fault Settings
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/residents") && "sidebar-link-active"
              )}
              onClick={() => setIsResidentsHubOpen((current) => !current)}
              aria-expanded={isResidentsHubOpen}
            >
              <span>Residents Hub</span>
              <span className={cn("sidebar-caret", isResidentsHubOpen && "sidebar-caret-open")}>
                {isResidentsHubOpen ? "−" : "+"}
              </span>
            </button>
            {isResidentsHubOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/residents" && "sidebar-sublink-active")}
                  href={"/dashboard/residents" as Route}
                >
                  Overview
                </Link>
                <Link
                  className="sidebar-sublink"
                  href={"/dashboard/residents?queue=active&context=Resident%20queue&action=review" as Route}
                >
                  Find a Resident
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/residents/map" && "sidebar-sublink-active")}
                  href={"/dashboard/residents/map" as Route}
                >
                  Residents Map
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/infrastructure") && "sidebar-link-active"
              )}
              onClick={() => setIsInfrastructureHubOpen((current) => !current)}
              aria-expanded={isInfrastructureHubOpen}
            >
              <span>Infrastructure Hub</span>
              <span className={cn("sidebar-caret", isInfrastructureHubOpen && "sidebar-caret-open")}>
                {isInfrastructureHubOpen ? "−" : "+"}
              </span>
            </button>
            {isInfrastructureHubOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn(
                    "sidebar-sublink",
                    currentPath === "/dashboard/infrastructure" && "sidebar-sublink-active"
                  )}
                  href={"/dashboard/infrastructure" as Route}
                >
                  Overview
                </Link>
                <Link
                  className={cn(
                    "sidebar-sublink",
                    currentPath === "/dashboard/infrastructure/map" && "sidebar-sublink-active"
                  )}
                  href={"/dashboard/infrastructure/map" as Route}
                >
                  Infrastructure Map
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/projects") && "sidebar-link-active"
              )}
              onClick={() => setIsProjectsHubOpen((current) => !current)}
              aria-expanded={isProjectsHubOpen}
            >
              <span>Projects Hub</span>
              <span className={cn("sidebar-caret", isProjectsHubOpen && "sidebar-caret-open")}>
                {isProjectsHubOpen ? "−" : "+"}
              </span>
            </button>
            {isProjectsHubOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/projects/overview" && "sidebar-sublink-active")}
                  href={"/dashboard/projects/overview" as Route}
                >
                  Overview
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/projects/manager" && "sidebar-sublink-active")}
                  href={"/dashboard/projects/manager" as Route}
                >
                  Manager
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/projects/my-projects-tasks" && "sidebar-sublink-active")}
                  href={"/dashboard/projects/my-projects-tasks" as Route}
                >
                  My Projects And Tasks
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/projects/reporting" && "sidebar-sublink-active")}
                  href={"/dashboard/projects/reporting" as Route}
                >
                  Reporting
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/pro") && "sidebar-link-active"
              )}
              onClick={() => setIsProHubOpen((current) => !current)}
              aria-expanded={isProHubOpen}
            >
              <span>PRO Hub</span>
              <span className={cn("sidebar-caret", isProHubOpen && "sidebar-caret-open")}>
                {isProHubOpen ? "−" : "+"}
              </span>
            </button>
            {isProHubOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/pro" && "sidebar-sublink-active")}
                  href={"/dashboard/pro" as Route}
                >
                  PlayGround
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/pro/donors" && "sidebar-sublink-active")}
                  href={"/dashboard/pro/donors" as Route}
                >
                  Donors
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-subnav sidebar-subnav-root">
            {visibleNavItems
              .filter(
                (item) =>
                  item.href !== "/dashboard/my-profile" &&
                  item.href !== "/dashboard/faults" &&
                  item.href !== "/dashboard/projects" &&
                  item.href !== "/dashboard/pro" &&
                  item.href !== "/dashboard/parking-lot" &&
                  item.href !== "/dashboard/hello-inbox" &&
                  item.href !== "/dashboard/vault" &&
                  item.href !== "/dashboard/help" &&
                  item.href !== "/dashboard/notifications" &&
                  item.href !== "/dashboard/super-admin"
              )
              .map((item) => (
              <Link
                key={item.href}
                className={cn("sidebar-sublink", currentPath === item.href && "sidebar-sublink-active")}
                href={item.href as Route}
              >
                <span className="sidebar-link-with-indicator">
                  <span>{item.label}</span>
                  {item.href === "/dashboard/notifications" && unreadNotifications > 0 ? (
                    <span className="sidebar-unread-dot" aria-label={`${unreadNotifications} unread notifications`} />
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
          <div className="sidebar-group">
            <button
              type="button"
              className={cn(
                "sidebar-link sidebar-group-toggle",
                currentPath.startsWith("/dashboard/meetings") && "sidebar-link-active"
              )}
              onClick={() => setIsMeetingsOpen((current) => !current)}
              aria-expanded={isMeetingsOpen}
            >
              <span>Decisions Hub</span>
              <span className={cn("sidebar-caret", isMeetingsOpen && "sidebar-caret-open")}>
                {isMeetingsOpen ? "−" : "+"}
              </span>
            </button>
            {isMeetingsOpen ? (
              <div className="sidebar-subnav">
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/meetings/scheduler" && "sidebar-sublink-active")}
                  href={"/dashboard/meetings/scheduler" as Route}
                >
                  Meeting Scheduler
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/meetings" && "sidebar-sublink-active")}
                  href={"/dashboard/meetings" as Route}
                >
                  Meeting Minuter
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/resolutions" && "sidebar-sublink-active")}
                  href={"/dashboard/resolutions" as Route}
                >
                  Resolutions
                </Link>
                <Link
                  className={cn("sidebar-sublink", currentPath === "/dashboard/parking-lot" && "sidebar-sublink-active")}
                  href={"/dashboard/parking-lot" as Route}
                >
                  Parking Lot
                </Link>
              </div>
            ) : null}
          </div>
          <div className="sidebar-subnav sidebar-subnav-root">
            {visibleNavItems
              .filter(
                (item) =>
                  item.href === "/dashboard/parking-lot" ||
                  item.href === "/dashboard/vault" ||
                  item.href === "/dashboard/help" ||
                  item.href === "/dashboard/notifications" ||
                  item.href === "/dashboard/super-admin"
              )
              .map((item) => (
                <Link
                  key={item.href}
                  className={cn("sidebar-sublink", currentPath === item.href && "sidebar-sublink-active")}
                  href={item.href as Route}
                >
                  <span className="sidebar-link-with-indicator">
                    <span>{item.label}</span>
                    {item.href === "/dashboard/notifications" && unreadNotifications > 0 ? (
                      <span className="sidebar-unread-dot" aria-label={`${unreadNotifications} unread notifications`} />
                    ) : null}
                  </span>
                </Link>
              ))}
          </div>
        </nav>

        <div className="profile-card">
          <small>{profileHeading}</small>
          <div className="profile-avatar-shell">
            {avatarImage ? (
              <Image
                src={avatarImage}
                alt={`${user.name} avatar`}
                className="profile-avatar-image"
                width={72}
                height={72}
                unoptimized
              />
            ) : (
              <div className="profile-avatar-placeholder">{initials || "CE"}</div>
            )}
          </div>
          <strong>{user.name}</strong>
          <span className={`profile-status-chip profile-status-chip-${user.status ?? "active"}`}>
            {user.status === "dnd"
              ? "DND"
              : user.status === "vacation"
                ? "On Vacation"
                : user.status === "offline"
                  ? "Offline"
                  : user.status === "busy"
                    ? "Busy"
                    : "Active"}
          </span>
          <span>{user.email}</span>
          {isSuperAdmin ? (
            <div className="meta-row">
              <span className={`status-chip status-chip-${toModeTone(communicationModes.email)}`}>
                Email: {communicationModes.email.toUpperCase()}
              </span>
              <span className={`status-chip status-chip-${toModeTone(communicationModes.telegram)}`}>
                Telegram: {communicationModes.telegram.toUpperCase()}
              </span>
            </div>
          ) : null}
          <button className="button-secondary profile-signout-button" type="button" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
        <div className="sidebar-clock-card" aria-live="polite">
          <small>SAST</small>
          <strong suppressHydrationWarning>{isClockReady ? sastDate : "--/--/----"}</strong>
          <span suppressHydrationWarning>{isClockReady ? sastDayName : "Loading..."}</span>
          <strong suppressHydrationWarning>{isClockReady ? sastTime : "--:--:--"}</strong>
        </div>
      </aside>

      <main className="main">
        {showPresenceDrawer ? (
          <div className="presence-toolbar">
            <button
              type="button"
              className="presence-trigger"
              ref={presenceTriggerRef}
              onClick={() => setIsPresenceDrawerOpen((current) => !current)}
              aria-expanded={isPresenceDrawerOpen}
            >
              <span className={`presence-dot presence-dot-${currentStatus}`} />
              <span>Status</span>
            </button>
          </div>
        ) : null}
        {showPresenceDrawer && unreadNotifications > 0 ? (
          <div className="notifications-toolbar">
            <button
              type="button"
              className="presence-trigger presence-trigger-secondary notifications-trigger notifications-trigger-attention"
              ref={notificationsTriggerRef}
              onClick={() => setIsNotificationsDrawerOpen((current) => !current)}
              aria-expanded={isNotificationsDrawerOpen}
            >
              <span>Notifications</span>
              <span className="presence-count-badge">{unreadNotifications}</span>
            </button>
          </div>
        ) : null}
        <div className="organisation-banner">{organisationName}</div>
        {helpHostElement
          ? createPortal(
              <Link href={helpHref} className="help-button app-shell-help-inline" aria-label="Open contextual help">
                ?
              </Link>,
              helpHostElement
            )
          : null}
        {children}
      </main>

      {showPresenceDrawer && isPresenceDrawerOpen ? (
        <aside className="presence-drawer" ref={presenceDrawerRef}>
          <div className="section-header">
            <div>
              <h2>Team Presence</h2>
              <p>Check availability and update your own status without leaving the page.</p>
            </div>
            <button type="button" className="button-secondary" onClick={() => setIsPresenceDrawerOpen(false)}>
              Close
            </button>
          </div>

          <article className="surface-panel">
            <div className="section-header">
              <div>
                <h2>You</h2>
                <p>Your current platform presence.</p>
              </div>
              <span className={`status-chip status-chip-${statusOptions.find((item) => item.value === currentStatus)?.tone ?? "default"}`}>
                {statusOptions.find((item) => item.value === currentStatus)?.label ?? "Active"}
              </span>
            </div>
            <div className="presence-person-card">
              <div className="profile-avatar-shell">
                {currentUserDisplay.avatarImage ? (
                  <Image
                    src={currentUserDisplay.avatarImage}
                    alt={`${currentUserDisplay.fullName} avatar`}
                    className="profile-avatar-image"
                    width={56}
                    height={56}
                    unoptimized
                  />
                ) : (
                  <div className="profile-avatar-placeholder">{initials || "CE"}</div>
                )}
              </div>
              <div>
                <strong>{currentUserDisplay.fullName}</strong>
                <p>{currentUserDisplay.email}</p>
              </div>
            </div>
            <div className="status-button-row">
              {statusOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`status-choice-button status-choice-button-${item.tone} ${currentStatus === item.value ? "status-choice-button-active" : ""}`}
                  onClick={() => updatePresenceStatus(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </article>

          <article className="surface-panel">
            <div className="section-header">
              <div>
                <h2>Team Status</h2>
                <p>Saved platform presence for the rest of the team.</p>
              </div>
            </div>
            <div className="dashboard-stack">
              {otherProfiles.length > 0 ? (
                otherProfiles.map((profile) => {
                  const otherInitials = profile.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("");

                  return (
                    <article key={profile.email} className="presence-person-card presence-person-card-row">
                      <div className="profile-avatar-shell presence-person-avatar-shell">
                        {profile.avatarImage ? (
                          <Image
                            src={profile.avatarImage}
                            alt={`${profile.fullName} avatar`}
                            className="profile-avatar-image"
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className="profile-avatar-placeholder">{otherInitials || "NA"}</div>
                        )}
                      </div>
                      <div className="presence-person-copy">
                        <strong>{profile.fullName}</strong>
                        <p>{profile.email}</p>
                      </div>
                      <span className={`profile-status-chip profile-status-chip-${profile.status ?? "active"}`}>
                        {profile.status === "dnd"
                          ? "DND"
                          : profile.status === "vacation"
                            ? "On Vacation"
                            : profile.status === "offline"
                              ? "Offline"
                              : profile.status === "busy"
                                ? "Busy"
                                : "Active"}
                      </span>
                    </article>
                  );
                })
              ) : (
                <article className="dashboard-today-card">
                  <strong>No other saved admin presence records yet.</strong>
                </article>
              )}
            </div>
          </article>
        </aside>
      ) : null}

      {showPresenceDrawer && isNotificationsDrawerOpen ? (
        <aside
          className="presence-drawer notifications-drawer"
          ref={notificationsDrawerRef}
          style={{ top: "auto", bottom: "88px", right: "24px" }}
        >
          <div className="section-header">
            <div>
              <h2>Notification Center</h2>
              <p>Operational alerts, delegate changes, and delivery updates for the admin team.</p>
            </div>
            <button type="button" className="button-secondary" onClick={() => setIsNotificationsDrawerOpen(false)}>
              Close
            </button>
          </div>

          <article className="surface-panel">
            <div className="section-header">
              <div>
                <h2>Latest Notifications</h2>
                <p>Shared in-app and Telegram-linked activity for admins.</p>
              </div>
              <span className="status-chip status-chip-default">
                {notificationFeed.length} items · {unreadNotifications} unread
              </span>
            </div>
            <div className="dashboard-stack">
              {notificationFeed.length > 0 ? (
                notificationFeed.map((item) => (
                  <article
                    key={item.id}
                    className={`dashboard-today-card ${!(item.readBy ?? []).includes(normalizedEmail) ? "notification-card-unread" : ""}`}
                  >
                    <div className="panel-head">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                      <div className="meta-row">
                        <span className={`status-chip status-chip-${item.importance === "critical" ? "danger" : "default"}`}>
                          {item.importance === "critical" ? "Critical" : "Info"}
                        </span>
                        <span className={`status-chip status-chip-${item.tone ?? "default"}`}>{item.channel}</span>
                      </div>
                    </div>
                    <div className="meta-row">
                      <span className="tag">{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                      {!(item.readBy ?? []).includes(normalizedEmail) ? <span className="tag notification-unread-tag">Unread</span> : null}
                    </div>
                  </article>
                ))
              ) : (
                <article className="dashboard-today-card">
                  <strong>No notifications yet.</strong>
                </article>
              )}
            </div>
          </article>
        </aside>
      ) : null}
    </div>
  );
}

