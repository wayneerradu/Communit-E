"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GlobalSearch } from "@/components/shared/global-search";
import type { Fault, FaultNote, GlobalSearchItem, Resident, SessionUser } from "@/types/domain";

type FaultsConsoleProps = {
  initialFaults: Fault[];
  initialNotes: FaultNote[];
  residents: Resident[];
  currentUser: SessionUser | null;
  focusFaultId?: string;
  focusQueue?: string;
  focusAction?: string;
  contextMessage?: string;
};

type PhaseKey = "phase-1" | "phase-2" | "phase-3";

const SLA_DAYS: Record<Fault["priority"], number> = {
  critical: 2,
  high: 5,
  medium: 10,
  low: 14
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start?: string | null, end?: string | null) {
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to) return null;
  const diff = to.getTime() - from.getTime();
  if (diff < 0) return null;
  return diff / (1000 * 60 * 60 * 24);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number | null) {
  return value === null ? "0.0" : value.toFixed(1);
}

function pct(value: number | null) {
  if (value === null || Number.isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function maxValue(values: number[]) {
  if (!values.length) return 1;
  return Math.max(...values, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeStreet(value?: string) {
  if (!value) return "";
  return value.split(",")[0].trim().toLowerCase().replace(/\s+/g, " ");
}

function formatStreet(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDisplayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEscalationStart(fault: Fault, notesMap: Map<string, FaultNote[]>) {
  if (fault.escalatedAt) return fault.escalatedAt;
  if (fault.createdAt) return fault.createdAt;
  const notes = notesMap.get(fault.id) ?? [];
  const first = notes
    .map((note) => parseDate(note.createdAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return first ? first.toISOString() : null;
}

function createBins(values: number[]) {
  const bins = [
    { label: "0-1d", min: 0, max: 1, count: 0 },
    { label: "1-3d", min: 1, max: 3, count: 0 },
    { label: "3-7d", min: 3, max: 7, count: 0 },
    { label: "7-14d", min: 7, max: 14, count: 0 },
    { label: "14+d", min: 14, max: Number.POSITIVE_INFINITY, count: 0 }
  ];
  for (const value of values) {
    const bin = bins.find((item) => value >= item.min && value < item.max);
    if (bin) bin.count += 1;
  }
  return bins;
}

function Gauge({
  label,
  value,
  tone,
  onClick
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "danger" | "success";
  onClick: () => void;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <button type="button" className="analytics-gauge-card dashboard-card-link" onClick={onClick}>
      <div className={`analytics-gauge analytics-gauge-${tone}`} style={{ ["--gauge-value" as string]: `${clamped}%` }}>
        <span>{Math.round(clamped)}%</span>
      </div>
      <small>{label}</small>
    </button>
  );
}

export function FaultsConsole({
  initialFaults,
  initialNotes,
  residents,
  currentUser,
  focusFaultId,
  focusQueue,
  focusAction,
  contextMessage
}: FaultsConsoleProps) {
  const [phase, setPhase] = useState<PhaseKey>("phase-1");
  const [drilldown, setDrilldown] = useState<string | null>(null);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const currentMonth = monthKey(now);
  const previousMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const notesMap = useMemo(() => {
    const map = new Map<string, FaultNote[]>();
    for (const note of initialNotes) {
      if (!map.has(note.faultId)) map.set(note.faultId, []);
      map.get(note.faultId)!.push(note);
    }
    return map;
  }, [initialNotes]);

  const faults = useMemo(
    () =>
      [...initialFaults].sort((a, b) => {
        const left = parseDate(a.createdAt)?.getTime() ?? 0;
        const right = parseDate(b.createdAt)?.getTime() ?? 0;
        return right - left;
      }),
    [initialFaults]
  );

  const nameByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const resident of residents) {
      if (resident.email && resident.name) {
        map.set(resident.email.toLowerCase(), resident.name);
      }
    }
    if (currentUser?.email && currentUser.name) {
      map.set(currentUser.email.toLowerCase(), currentUser.name);
    }
    return map;
  }, [currentUser, residents]);

  function adminLabel(email: string) {
    const lookup = nameByEmail.get(email.toLowerCase());
    return lookup ?? toDisplayNameFromEmail(email);
  }

  const openFaults = faults.filter((fault) => fault.status !== "closed" && fault.status !== "archived");
  const closedFaults = faults.filter((fault) => fault.status === "closed");
  const awaitingResponseFaults = openFaults.filter((fault) => fault.status === "escalated");
  const inProgressFaults = openFaults.filter((fault) => fault.status === "in-progress");
  const criticalFaults = openFaults.filter((fault) => fault.priority === "critical");
  const highFaults = openFaults.filter((fault) => fault.priority === "high");
  const mediumFaults = openFaults.filter((fault) => fault.priority === "medium");
  const lowFaults = openFaults.filter((fault) => fault.priority === "low");
  const escalatedToSupervisors = openFaults.filter((fault) => fault.internalEscalated).length;
  const escalatedToManagement = openFaults.filter((fault) => fault.externalEscalated).length;

  const faultDurations = faults.map((fault) => {
    const start = getEscalationStart(fault, notesMap);
    return {
      fault,
      start,
      responseDays: daysBetween(start, fault.firstInProgressAt),
      closureDays: daysBetween(start, fault.closedAt),
      ageDays: daysBetween(start, now.toISOString()) ?? 0
    };
  });

  const todayOpened = faults.filter((fault) => {
    const created = parseDate(fault.createdAt);
    return created ? created >= todayStart : false;
  }).length;
  const weekOpened = faults.filter((fault) => {
    const created = parseDate(fault.createdAt);
    return created ? created >= sevenDaysAgo : false;
  }).length;
  const monthOpened = faults.filter((fault) => {
    const created = parseDate(fault.createdAt);
    return created ? created >= thirtyDaysAgo : false;
  }).length;

  const todayClosed = closedFaults.filter((fault) => {
    const closed = parseDate(fault.closedAt);
    return closed ? closed >= todayStart : false;
  }).length;
  const weekClosed = closedFaults.filter((fault) => {
    const closed = parseDate(fault.closedAt);
    return closed ? closed >= sevenDaysAgo : false;
  }).length;
  const monthClosed = closedFaults.filter((fault) => {
    const closed = parseDate(fault.closedAt);
    return closed ? closed >= thirtyDaysAgo : false;
  }).length;

  const netBacklog30 = monthOpened - monthClosed;

  const responseValues = faultDurations.map((item) => item.responseDays).filter((value): value is number => typeof value === "number");
  const closureValues = faultDurations.map((item) => item.closureDays).filter((value): value is number => typeof value === "number");
  const medianResponse = median(responseValues);
  const medianClosure = median(closureValues);
  const p90Closure = percentile(closureValues, 90);

  const slaByPriority = (["critical", "high", "medium", "low"] as Fault["priority"][]).map((priority) => {
    const all = faultDurations.filter((item) => item.fault.priority === priority);
    const breaches = all.filter((item) => {
      const threshold = SLA_DAYS[priority];
      const effective = item.fault.status === "closed" ? item.closureDays : item.ageDays;
      return (effective ?? 0) > threshold;
    }).length;
    return {
      priority,
      total: all.length,
      breaches,
      rate: all.length ? (breaches / all.length) * 100 : 0
    };
  });
  const totalSlaCount = slaByPriority.reduce((sum, item) => sum + item.total, 0);
  const totalSlaBreaches = slaByPriority.reduce((sum, item) => sum + item.breaches, 0);
  const slaBreachRate = totalSlaCount ? (totalSlaBreaches / totalSlaCount) * 100 : 0;
  const criticalOlderThanSla = faultDurations.filter(
    (item) => item.fault.priority === "critical" && item.fault.status !== "closed" && item.ageDays > SLA_DAYS.critical
  ).length;

  const repeatEscalationMap = new Map<string, number>();
  for (const item of faultDurations) {
    const key = `${item.fault.category}|${normalizeStreet(item.fault.locationText) || "unknown"}`;
    repeatEscalationMap.set(key, (repeatEscalationMap.get(key) ?? 0) + (item.fault.escalationCount ?? 1));
  }
  const repeatEscalationCount = Array.from(repeatEscalationMap.values()).filter((count) => count > 1).length;

  const categoryStats = Array.from(
    faultDurations.reduce((map, item) => {
      const key = item.fault.category || "Unclassified";
      if (!map.has(key)) map.set(key, { total: 0, closed: 0, response: [] as number[], closure: [] as number[] });
      const bucket = map.get(key)!;
      bucket.total += 1;
      if (item.fault.status === "closed") bucket.closed += 1;
      if (typeof item.responseDays === "number") bucket.response.push(item.responseDays);
      if (typeof item.closureDays === "number") bucket.closure.push(item.closureDays);
      return map;
    }, new Map<string, { total: number; closed: number; response: number[]; closure: number[] }>())
  )
    .map(([key, value]) => ({
      key,
      total: value.total,
      closed: value.closed,
      closureRate: value.total ? (value.closed / value.total) * 100 : 0,
      avgResponse: average(value.response),
      avgClosure: average(value.closure),
      share: faults.length ? (value.total / faults.length) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const subCategoryStats = Array.from(
    faultDurations.reduce((map, item) => {
      const key = item.fault.subCategory || "Unspecified";
      if (!map.has(key)) map.set(key, [] as number[]);
      if (typeof item.closureDays === "number") map.get(key)!.push(item.closureDays);
      return map;
    }, new Map<string, number[]>())
  )
    .map(([key, values]) => ({ key, avgClosure: average(values) }))
    .filter((item) => item.avgClosure !== null)
    .sort((a, b) => (a.avgClosure ?? 0) - (b.avgClosure ?? 0));

  const fastestSubCategory = subCategoryStats[0];
  const slowestSubCategory = subCategoryStats[subCategoryStats.length - 1];

  const adminMap = new Map<string, { opened: number; progressed: number; closed: number; closures: number[]; reopenCases: number; reEscalatedCases: number; totalHandled: number }>();
  const ensureAdmin = (email: string) => {
    const key = email.trim() || "unassigned@local";
    if (!adminMap.has(key)) {
      adminMap.set(key, { opened: 0, progressed: 0, closed: 0, closures: [], reopenCases: 0, reEscalatedCases: 0, totalHandled: 0 });
    }
    return adminMap.get(key)!;
  };
  for (const item of faultDurations) {
    const opener = ensureAdmin(item.fault.reporterEmail);
    opener.opened += 1;
    opener.totalHandled += 1;

    const progressActors = new Set(
      (item.fault.statusHistory ?? [])
        .filter((event) => event.status === "in-progress" && event.byEmail)
        .map((event) => event.byEmail as string)
    );
    for (const actor of progressActors) {
      const progressAdmin = ensureAdmin(actor);
      progressAdmin.progressed += 1;
      progressAdmin.totalHandled += 1;
    }

    if (item.fault.closedByAdminEmail) {
      const closer = ensureAdmin(item.fault.closedByAdminEmail);
      closer.closed += 1;
      closer.totalHandled += 1;
      if (typeof item.closureDays === "number") closer.closures.push(item.closureDays);
      if ((item.fault.reopenCount ?? 0) > 0) closer.reopenCases += 1;
      if ((item.fault.escalationCount ?? 0) > 1) closer.reEscalatedCases += 1;
    }
  }

  const adminStats = Array.from(adminMap.entries())
    .map(([email, value]) => ({
      email,
      ...value,
      avgClosure: average(value.closures),
      reopenRate: value.closed ? (value.reopenCases / value.closed) * 100 : 0,
      reEscalationRate: value.closed ? (value.reEscalatedCases / value.closed) * 100 : 0
    }))
    .sort((a, b) => b.closed - a.closed);

  const totalWorkload = adminStats.reduce((sum, item) => sum + item.totalHandled, 0);
  const workloadShares = adminStats.map((item) => (totalWorkload ? item.totalHandled / totalWorkload : 0));
  const workloadBalanceIndex = workloadShares.reduce((sum, share) => sum + share * share, 0);

  const monthlyAdminClosures = new Map<string, { current: number; previous: number }>();
  for (const item of faultDurations) {
    const closedBy = item.fault.closedByAdminEmail;
    const closedDate = parseDate(item.fault.closedAt);
    if (!closedBy || !closedDate) continue;
    if (!monthlyAdminClosures.has(closedBy)) monthlyAdminClosures.set(closedBy, { current: 0, previous: 0 });
    const bucket = monthlyAdminClosures.get(closedBy)!;
    const key = monthKey(closedDate);
    if (key === currentMonth) bucket.current += 1;
    if (key === previousMonth) bucket.previous += 1;
  }
  const topCloser = Array.from(monthlyAdminClosures.entries()).sort((a, b) => b[1].current - a[1].current)[0];
  const mostImproved = Array.from(monthlyAdminClosures.entries())
    .map(([email, data]) => ({ email, delta: data.current - data.previous }))
    .sort((a, b) => b.delta - a.delta)[0];

  const fullFieldsCount = faults.filter((fault) => Boolean(fault.title && fault.ethekwiniReference && fault.description && fault.reporterEmail && fault.category && fault.subCategory && fault.priority && fault.locationText)).length;
  const mapValidCount = faults.filter((fault) => Boolean(fault.locationText && typeof fault.latitude === "number" && typeof fault.longitude === "number")).length;
  const duplicateMap = new Map<string, number>();
  for (const fault of faults) {
    const key = `${fault.ethekwiniReference ?? ""}|${fault.title.trim().toLowerCase()}|${normalizeStreet(fault.locationText)}`;
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  }
  const duplicateCount = Array.from(duplicateMap.values()).reduce((sum, value) => sum + (value > 1 ? value - 1 : 0), 0);
  const unassignedCount = faults.filter((fault) => !fault.assignedAdminName).length;
  const staleDays = 7;
  const staleFaults = openFaults.filter((fault) => {
    const updated = parseDate(fault.updatedAt ?? fault.createdAt);
    return updated ? (daysBetween(updated.toISOString(), now.toISOString()) ?? 0) > staleDays : false;
  }).length;

  const streetImpact = Array.from(
    faults.reduce((map, fault) => {
      const street = normalizeStreet(fault.locationText);
      if (!street) return map;
      map.set(street, (map.get(street) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([street, count]) => ({ street: formatStreet(street), count }))
    .sort((a, b) => b.count - a.count);

  const residentsByCategory = categoryStats
    .map((category) => {
      const residentsSet = new Set(
        faults
          .filter((fault) => fault.category === category.key && fault.residentId)
          .map((fault) => fault.residentId as string)
      );
      return { category: category.key, residents: residentsSet.size };
    })
    .sort((a, b) => b.residents - a.residents);

  const residentFaultMap = new Map<string, number>();
  for (const fault of faults) {
    if (!fault.residentId) continue;
    residentFaultMap.set(fault.residentId, (residentFaultMap.get(fault.residentId) ?? 0) + 1);
  }
  const topResidentFaultLogger = Array.from(residentFaultMap.entries())
    .map(([residentId, count]) => ({
      residentId,
      count,
      residentName: residents.find((resident) => resident.id === residentId)?.name ?? residentId
    }))
    .sort((a, b) => b.count - a.count)[0];

  const communityClosureRate = faults.length ? (closedFaults.length / faults.length) * 100 : 0;

  const statusEvents = faults.flatMap((fault) => (fault.statusHistory ?? []).map((event) => ({ ...event, faultId: fault.id })));
  let timelyUpdates = 0;
  for (const event of statusEvents) {
    const eventDate = parseDate(event.at);
    if (!eventDate) continue;
    const notes = notesMap.get(event.faultId) ?? [];
    const hasUpdate = notes.some((note) => {
      const noteDate = parseDate(note.createdAt);
      if (!noteDate) return false;
      const hours = (noteDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
      return hours >= 0 && hours <= 24;
    });
    if (hasUpdate) timelyUpdates += 1;
  }
  const trustMetric = statusEvents.length ? (timelyUpdates / statusEvents.length) * 100 : 0;

  const forecastByCategory = Array.from(
    faults.reduce((map, fault) => {
      const created = parseDate(fault.createdAt);
      if (!created) return map;
      const category = fault.category || "Unclassified";
      if (!map.has(category)) map.set(category, { last30: 0, previous30: 0 });
      const bucket = map.get(category)!;
      const age = daysBetween(created.toISOString(), now.toISOString()) ?? 0;
      if (age <= 30) bucket.last30 += 1;
      else if (age <= 60) bucket.previous30 += 1;
      return map;
    }, new Map<string, { last30: number; previous30: number }>())
  )
    .map(([category, data]) => ({
      category,
      forecast: Math.max(0, Math.round(data.last30 + (data.last30 - data.previous30))),
      baseline: data.last30
    }))
    .sort((a, b) => b.forecast - a.forecast);

  const weekPattern = Array.from({ length: 7 }, (_, index) => ({
    label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index],
    count: 0
  }));
  for (const fault of faults) {
    const created = parseDate(fault.createdAt);
    if (!created) continue;
    weekPattern[created.getDay()].count += 1;
  }

  const surgeSignals = Array.from(
    faults.reduce((map, fault) => {
      const created = parseDate(fault.createdAt);
      if (!created) return map;
      const category = fault.category || "Unclassified";
      if (!map.has(category)) map.set(category, { currentWeek: 0, previousWeek: 0 });
      const bucket = map.get(category)!;
      const age = daysBetween(created.toISOString(), now.toISOString()) ?? 0;
      if (age <= 7) bucket.currentWeek += 1;
      else if (age <= 14) bucket.previousWeek += 1;
      return map;
    }, new Map<string, { currentWeek: number; previousWeek: number }>())
  )
    .map(([category, data]) => {
      const delta = data.currentWeek - data.previousWeek;
      const growth = data.previousWeek ? (delta / data.previousWeek) * 100 : data.currentWeek > 0 ? 100 : 0;
      return { category, currentWeek: data.currentWeek, previousWeek: data.previousWeek, growth };
    })
    .sort((a, b) => b.growth - a.growth);

  const responseHistogram = createBins(responseValues);
  const closureHistogram = createBins(closureValues);
  const maxHistogram = maxValue([...responseHistogram.map((item) => item.count), ...closureHistogram.map((item) => item.count)]);
  const maxCategoryTotal = maxValue(categoryStats.map((item) => item.total));
  const maxAdminClosed = maxValue(adminStats.map((item) => item.closed));
  const maxStreetCount = maxValue(streetImpact.map((item) => item.count));
  const maxForecast = maxValue(forecastByCategory.map((item) => item.forecast));
  const maxWeekPattern = maxValue(weekPattern.map((item) => item.count));
  const maxSurgeGrowth = maxValue(surgeSignals.map((item) => Math.abs(item.growth)));

  const topCategory = categoryStats[0];
  const topSubCategory = subCategoryStats
    .slice()
    .sort((a, b) => (b.avgClosure ?? 0) - (a.avgClosure ?? 0))[0];
  const oldestOpen = openFaults
    .slice()
    .sort((a, b) => {
      const left = parseDate(getEscalationStart(a, notesMap))?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const right = parseDate(getEscalationStart(b, notesMap))?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    })[0];
  const oldestOpenDays = oldestOpen ? Math.floor(daysBetween(getEscalationStart(oldestOpen, notesMap), now.toISOString()) ?? 0) : 0;

  const searchItems: GlobalSearchItem[] = faults.map((fault) => ({
    id: fault.id,
    title: `${fault.id} - ${fault.title}`,
    subtitle: [fault.locationText, fault.category, fault.priority, fault.status].filter(Boolean).join(" - "),
    kind: "fault",
    keywords: [fault.description, fault.reporterEmail, fault.subCategory, fault.ethekwiniReference, fault.assignedAdminName].filter(Boolean) as string[]
  }));

  function openInsight(id: string, phaseTarget?: PhaseKey) {
    setDrilldown(id);
    if (phaseTarget) setPhase(phaseTarget);
    const node = document.getElementById("insight-drilldown-results");
    if (node) {
      setTimeout(() => node.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }

  function drilldownLabel(value: string | null) {
    if (!value) return "All Captured Faults";
    return value
      .replace(/^insight-/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  const drilldownFaults = useMemo(() => {
    if (!drilldown) return faults;
    if (drilldown === "open-escalated") return openFaults;
    if (drilldown === "awaiting-response") return awaitingResponseFaults;
    if (drilldown === "in-progress") return inProgressFaults;
    if (drilldown === "critical-faults") return criticalFaults;
    if (drilldown === "high-faults") return highFaults;
    if (drilldown === "medium-faults") return mediumFaults;
    if (drilldown === "low-faults") return lowFaults;
    if (drilldown === "supervisors") return faults.filter((fault) => fault.internalEscalated);
    if (drilldown === "management") return faults.filter((fault) => fault.externalEscalated);
    if (drilldown.startsWith("sla-")) {
      const priority = drilldown.replace("sla-", "") as Fault["priority"];
      return faultDurations
        .filter(
          (item) =>
            item.fault.priority === priority &&
            (item.fault.status === "closed" ? (item.closureDays ?? 0) : item.ageDays) > SLA_DAYS[priority]
        )
        .map((item) => item.fault);
    }
    if (drilldown.startsWith("category-")) {
      const key = drilldown.replace("category-", "");
      return faults.filter((fault) => fault.category.toLowerCase() === key.toLowerCase());
    }
    if (drilldown.startsWith("admin-")) {
      const key = drilldown.replace("admin-", "");
      return faults.filter((fault) => {
        const actors = new Set<string>([
          fault.reporterEmail,
          fault.closedByAdminEmail ?? "",
          ...((fault.statusHistory ?? []).map((event) => event.byEmail ?? ""))
        ]);
        return Array.from(actors).some((email) => email.toLowerCase() === key.toLowerCase());
      });
    }
    if (drilldown.startsWith("street-")) {
      const key = drilldown.replace("street-", "").toLowerCase();
      return faults.filter((fault) => normalizeStreet(fault.locationText) === key);
    }
    if (drilldown.startsWith("residents-")) {
      const key = drilldown.replace("residents-", "");
      return faults.filter((fault) => fault.category.toLowerCase() === key.toLowerCase());
    }
    if (drilldown === "top-resident-logger" && topResidentFaultLogger) {
      return faults.filter((fault) => fault.residentId === topResidentFaultLogger.residentId);
    }
    if (drilldown.startsWith("forecast-")) {
      const key = drilldown.replace("forecast-", "");
      return faults.filter((fault) => fault.category.toLowerCase() === key.toLowerCase());
    }
    if (drilldown.startsWith("surge-")) {
      const key = drilldown.replace("surge-", "");
      return faults.filter((fault) => fault.category.toLowerCase() === key.toLowerCase());
    }
    if (drilldown.startsWith("weekday-")) {
      const key = drilldown.replace("weekday-", "");
      const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(key);
      if (index >= 0) {
        return faults.filter((fault) => parseDate(fault.createdAt)?.getDay() === index);
      }
    }
    return faults;
  }, [
    drilldown,
    faults,
    openFaults,
    awaitingResponseFaults,
    inProgressFaults,
    criticalFaults,
    highFaults,
    mediumFaults,
    lowFaults,
    faultDurations,
    topResidentFaultLogger
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Faults Hub</h1>
          <p>Overview of captured faults with deep operational intelligence.</p>
        </div>
        <div className="dashboard-actions">
          <GlobalSearch items={searchItems} onItemSelect={(item) => openInsight(item.id, "phase-1")} />
          <Link className="button-secondary" href="/dashboard/faults/register">Fault Queue</Link>
          <Link className="button-primary" href="/dashboard/faults/log">Escalate Fault</Link>
        </div>
      </header>

      {contextMessage ? (
        <section className="flash-panel flash-panel-default dashboard-context-banner dashboard-context-banner-sticky">
          <div className="panel-head"><strong>Opened from Admin Dashboard</strong></div>
          <p>{contextMessage}</p>
        </section>
      ) : null}

      <section className="dashboard-stat-grid dashboard-stat-grid-six">
        <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => openInsight("open-escalated", "phase-1")}><span>Open</span><strong>{openFaults.length}</strong><small>Open Escalated Faults</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => openInsight("awaiting-response", "phase-1")}><span>Awaiting Response</span><strong>{awaitingResponseFaults.length}</strong><small>Nudges and feedback due</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => openInsight("supervisors", "phase-1")}><span>Escalate+</span><strong>{escalatedToSupervisors}</strong><small>Escalated to Supervisors</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => openInsight("management", "phase-1")}><span>Escalate++</span><strong>{escalatedToManagement}</strong><small>Escalated to Management</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => openInsight("in-progress", "phase-1")}><span>In Progress</span><strong>{inProgressFaults.length}</strong><small>Municipality or field action</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-danger dashboard-stat-button dashboard-card-link" onClick={() => openInsight("critical-faults", "phase-1")}><span>Critical Faults</span><strong>{criticalFaults.length}</strong><small>Open critical faults</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-warning dashboard-stat-button dashboard-card-link" onClick={() => openInsight("high-faults", "phase-1")}><span>High Priority Faults</span><strong>{highFaults.length}</strong><small>Open high faults</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => openInsight("medium-faults", "phase-1")}><span>Medium Priority Faults</span><strong>{mediumFaults.length}</strong><small>Open medium faults</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-success dashboard-stat-button dashboard-card-link" onClick={() => openInsight("low-faults", "phase-1")}><span>Low Priority Faults</span><strong>{lowFaults.length}</strong><small>Open low faults</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => openInsight("most-category", "phase-2")}><span>Most Faults by Category</span><strong>{topCategory?.total ?? 0}</strong><small>{topCategory?.key ?? "No category"}</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => openInsight("most-subcategory", "phase-2")}><span>Most Faults by Subcategory</span><strong>{topSubCategory ? Math.round(topSubCategory.avgClosure ?? 0) : 0}</strong><small>{topSubCategory?.key ?? "No subcategory"}</small></button>
        <button type="button" className="dashboard-stat-card dashboard-stat-card-default dashboard-stat-button dashboard-card-link" onClick={() => openInsight("oldest-fault", "phase-3")}><span>Oldest Fault</span><strong>{oldestOpenDays}</strong><small>{oldestOpen ? `${oldestOpen.id} days open` : "No open faults"}</small></button>
      </section>

      <section className="surface-panel clean-marine-panel">
        <div className="section-header">
          <div>
            <h2>Insights Control</h2>
            <p>All charts and tiles are clickable and route to drilldowns.</p>
          </div>
        </div>
        <div className="dashboard-actions-row">
          <button className={`button-secondary${phase === "phase-1" ? " dashboard-action-highlight-secondary" : ""}`} type="button" onClick={() => setPhase("phase-1")}>Phase 1: Speed and SLA</button>
          <button className={`button-secondary${phase === "phase-2" ? " dashboard-action-highlight-secondary" : ""}`} type="button" onClick={() => setPhase("phase-2")}>Phase 2: Department and Admin</button>
          <button className={`button-secondary${phase === "phase-3" ? " dashboard-action-highlight-secondary" : ""}`} type="button" onClick={() => setPhase("phase-3")}>Phase 3: Quality and Predictive</button>
        </div>
        {drilldown ? <div className="meta-row"><span className="tag">Current drilldown: {drilldown}</span></div> : null}
      </section>

      {phase === "phase-1" ? (
        <section id="insight-open-escalated" className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>Speed and Throughput</h2><p>New and closed faults across today, 7d, and 30d windows.</p></div></div>
            <div className="analytics-chart-stack">
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("new-faults-today")}><strong>New faults (today)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-default" style={{ width: `${(todayOpened / maxValue([todayOpened, weekOpened, monthOpened])) * 100}%` }} /></div><span>{todayOpened}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("new-faults-7d")}><strong>New faults (7d)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-default" style={{ width: `${(weekOpened / maxValue([todayOpened, weekOpened, monthOpened])) * 100}%` }} /></div><span>{weekOpened}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("new-faults-30d")}><strong>New faults (30d)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-default" style={{ width: `${(monthOpened / maxValue([todayOpened, weekOpened, monthOpened])) * 100}%` }} /></div><span>{monthOpened}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("closed-faults-today")}><strong>Closed faults (today)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(todayClosed / maxValue([todayClosed, weekClosed, monthClosed])) * 100}%` }} /></div><span>{todayClosed}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("closed-faults-7d")}><strong>Closed faults (7d)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(weekClosed / maxValue([todayClosed, weekClosed, monthClosed])) * 100}%` }} /></div><span>{weekClosed}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("closed-faults-30d")}><strong>Closed faults (30d)</strong><div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(monthClosed / maxValue([todayClosed, weekClosed, monthClosed])) * 100}%` }} /></div><span>{monthClosed}</span></button>
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("net-backlog-30d")}><strong>Net backlog (30d)</strong><div className="analytics-bar-track"><span className={`analytics-bar-fill ${netBacklog30 > 0 ? "analytics-bar-fill-danger" : "analytics-bar-fill-success"}`} style={{ width: `${(Math.abs(netBacklog30) / maxValue([Math.abs(netBacklog30), 1])) * 100}%` }} /></div><span>{netBacklog30}</span></button>
            </div>
            <div className="meta-row">
              <span className="tag">Median response: {round1(medianResponse)} days</span>
              <span className="tag">Median closure: {round1(medianClosure)} days</span>
              <span className="tag">90th percentile closure: {round1(p90Closure)} days</span>
            </div>
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>SLA and Risk</h2><p>Breach counts, rates, aging pressure, and repeat escalation hotspots.</p></div></div>
            <div className="analytics-chart-stack">
              {slaByPriority.map((row) => (
                <button key={row.priority} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`sla-${row.priority}`)}>
                  <strong>{row.priority.toUpperCase()} breaches</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-danger" style={{ width: `${(row.breaches / maxValue(slaByPriority.map((item) => item.breaches))) * 100}%` }} /></div>
                  <span>{row.breaches}/{row.total}</span>
                </button>
              ))}
            </div>
            <div className="analytics-gauge-grid">
              <Gauge label="SLA breach rate" value={slaBreachRate} tone={slaBreachRate > 25 ? "danger" : slaBreachRate > 10 ? "warning" : "success"} onClick={() => openInsight("sla-breach-rate")} />
              <Gauge label="Critical over SLA" value={criticalFaults.length ? (criticalOlderThanSla / criticalFaults.length) * 100 : 0} tone={criticalOlderThanSla > 0 ? "danger" : "success"} onClick={() => openInsight("critical-older-than-sla")} />
              <Gauge label="Repeat escalation pressure" value={faults.length ? (repeatEscalationCount / faults.length) * 100 : 0} tone={repeatEscalationCount > 0 ? "warning" : "success"} onClick={() => openInsight("repeat-escalations")} />
            </div>
          </article>
        </section>
      ) : null}

      {phase === "phase-2" ? (
        <section id="insight-most-category" className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>Department and Category Performance</h2><p>Closure rate, response time, closure time, and category share.</p></div></div>
            <div className="analytics-chart-stack">
              {categoryStats.map((item) => (
                <button key={item.key} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`category-${item.key}`)}>
                  <strong>{item.key}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-default" style={{ width: `${(item.total / maxCategoryTotal) * 100}%` }} /></div>
                  <span>{item.total}</span>
                </button>
              ))}
            </div>
            <div className="meta-row">
              {categoryStats.slice(0, 6).map((item) => (
                <button key={`cat-${item.key}`} type="button" className="tag dashboard-card-link" onClick={() => openInsight(`category-kpi-${item.key}`)}>
                  {item.key}: close {pct(item.closureRate)} | resp {round1(item.avgResponse)}d | finish {round1(item.avgClosure)}d | share {pct(item.share)}
                </button>
              ))}
            </div>
            <div className="meta-row">
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("fastest-subcategory")}>Fastest subcategory: {fastestSubCategory?.key ?? "N/A"} ({round1(fastestSubCategory?.avgClosure ?? null)}d)</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("slowest-subcategory")}>Slowest subcategory: {slowestSubCategory?.key ?? "N/A"} ({round1(slowestSubCategory?.avgClosure ?? null)}d)</button>
            </div>
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>Admin Performance and Workload</h2><p>Handled counts, quality ratios, and gamified leadership.</p></div></div>
            <div className="analytics-podium-grid">
              <button type="button" className="analytics-podium-card analytics-podium-gold dashboard-card-link" onClick={() => openInsight("top-closer")}>
                <strong>Gold Trophy</strong>
                <p>{topCloser ? adminLabel(topCloser[0]) : "No winner yet"}</p>
                <small>{topCloser ? `${topCloser[1].current} closures this month` : "Awaiting data"}</small>
              </button>
              <button type="button" className="analytics-podium-card analytics-podium-silver dashboard-card-link" onClick={() => openInsight("most-improved")}>
                <strong>Silver Trophy</strong>
                <p>{mostImproved ? adminLabel(mostImproved.email) : "No winner yet"}</p>
                <small>{mostImproved ? `Improvement ${mostImproved.delta >= 0 ? "+" : ""}${mostImproved.delta}` : "Awaiting data"}</small>
              </button>
              <button type="button" className="analytics-podium-card analytics-podium-bronze dashboard-card-link" onClick={() => openInsight("top-resident-logger", "phase-3")}>
                <strong>Bronze Trophy</strong>
                <p>{topResidentFaultLogger ? topResidentFaultLogger.residentName : "No winner yet"}</p>
                <small>{topResidentFaultLogger ? `${topResidentFaultLogger.count} linked faults logged` : "Awaiting data"}</small>
              </button>
            </div>
            <div className="analytics-chart-stack">
              {adminStats.map((admin) => (
                <button key={admin.email} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`admin-${admin.email}`)}>
                  <strong>{adminLabel(admin.email)}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(admin.closed / maxAdminClosed) * 100}%` }} /></div>
                  <span>O:{admin.opened} P:{admin.progressed} C:{admin.closed}</span>
                </button>
              ))}
            </div>
            <div className="meta-row">
              {adminStats.slice(0, 5).map((admin) => (
                <button key={`admin-rate-${admin.email}`} type="button" className="tag dashboard-card-link" onClick={() => openInsight(`admin-rate-${admin.email}`)}>
                  {adminLabel(admin.email)}: avg close {round1(admin.avgClosure)}d | reopen {pct(admin.reopenRate)} | re-escalate {pct(admin.reEscalationRate)}
                </button>
              ))}
            </div>
            <div className="meta-row">
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("workload-balance")}>Workload balance index: {workloadBalanceIndex.toFixed(3)}</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("top-closer")}>Top closer (month): {topCloser ? `${adminLabel(topCloser[0])} (${topCloser[1].current})` : "N/A"}</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("most-improved")}>Most improved (month): {mostImproved ? `${adminLabel(mostImproved.email)} (${mostImproved.delta >= 0 ? "+" : ""}${mostImproved.delta})` : "N/A"}</button>
            </div>
          </article>
        </section>
      ) : null}

      {phase === "phase-3" ? (
        <section id="insight-quality" className="dashboard-feature-grid">
          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>Quality and Data Health</h2><p>Field completeness, geospatial quality, duplication, assignment, and stale queue.</p></div></div>
            <div className="analytics-gauge-grid">
              <Gauge label="Full required fields" value={faults.length ? (fullFieldsCount / faults.length) * 100 : 0} tone="success" onClick={() => openInsight("quality-full-fields")} />
              <Gauge label="Valid map pin/location" value={faults.length ? (mapValidCount / faults.length) * 100 : 0} tone="default" onClick={() => openInsight("quality-map-valid")} />
              <Gauge label="Duplicate fault rate" value={faults.length ? (duplicateCount / faults.length) * 100 : 0} tone={duplicateCount > 0 ? "warning" : "success"} onClick={() => openInsight("quality-duplicate-rate")} />
              <Gauge label={`Stale queue (${staleDays}+d)`} value={openFaults.length ? (staleFaults / openFaults.length) * 100 : 0} tone={staleFaults > 0 ? "danger" : "success"} onClick={() => openInsight("quality-stale")} />
            </div>
            <div className="meta-row">
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("quality-unassigned")}>Unassigned faults: {unassignedCount}</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("quality-stale")}>Faults with no update in {staleDays}+ days: {staleFaults}</button>
            </div>
            <div className="analytics-chart-stack">
              {responseHistogram.map((bin) => (
                <button key={`resp-${bin.label}`} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`response-bin-${bin.label}`)}>
                  <strong>Response histogram {bin.label}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-warning" style={{ width: `${(bin.count / maxHistogram) * 100}%` }} /></div>
                  <span>{bin.count}</span>
                </button>
              ))}
              {closureHistogram.map((bin) => (
                <button key={`close-${bin.label}`} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`closure-bin-${bin.label}`)}>
                  <strong>Closure histogram {bin.label}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(bin.count / maxHistogram) * 100}%` }} /></div>
                  <span>{bin.count}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="surface-panel clean-marine-panel">
            <div className="section-header"><div><h2>Resident Impact and Predictive Planning</h2><p>Area impact, trust, resident links, forecast, seasonal patterns, and surge signals.</p></div></div>
            <div className="analytics-chart-stack">
              {streetImpact.slice(0, 6).map((item) => (
                <button key={item.street} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`street-${item.street}`)}>
                  <strong>{item.street}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-warning" style={{ width: `${(item.count / maxStreetCount) * 100}%` }} /></div>
                  <span>{item.count}</span>
                </button>
              ))}
              <button type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight("top-resident-logger")}>
                <strong>Resident logging most faults</strong>
                <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-danger" style={{ width: `${(topResidentFaultLogger?.count ?? 0) / maxValue([topResidentFaultLogger?.count ?? 0, 1]) * 100}%` }} /></div>
                <span>{topResidentFaultLogger ? `${topResidentFaultLogger.residentName} (${topResidentFaultLogger.count})` : "N/A"}</span>
              </button>
            </div>
            <div className="meta-row">
              {residentsByCategory.slice(0, 5).map((item) => (
                <button key={`res-${item.category}`} type="button" className="tag dashboard-card-link" onClick={() => openInsight(`residents-${item.category}`)}>
                  {item.category}: {item.residents} resident(s) impacted
                </button>
              ))}
            </div>
            <div className="meta-row">
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("closure-rate-community")}>Community-facing closure rate: {pct(communityClosureRate)}</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("public-trust")}>Public trust metric (update within 24h): {pct(trustMetric)}</button>
              <button type="button" className="tag dashboard-card-link" onClick={() => openInsight("top-resident-logger")}>Most faults logged by resident: {topResidentFaultLogger ? `${topResidentFaultLogger.residentName} (${topResidentFaultLogger.count})` : "N/A"}</button>
            </div>
            <div className="analytics-chart-stack">
              {forecastByCategory.map((item) => (
                <button key={`forecast-${item.category}`} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`forecast-${item.category}`)}>
                  <strong>Forecast 30d {item.category}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-default" style={{ width: `${(item.forecast / maxForecast) * 100}%` }} /></div>
                  <span>{item.forecast}</span>
                </button>
              ))}
              {weekPattern.map((item) => (
                <button key={`day-${item.label}`} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`weekday-${item.label}`)}>
                  <strong>Seasonal weekday {item.label}</strong>
                  <div className="analytics-bar-track"><span className="analytics-bar-fill analytics-bar-fill-success" style={{ width: `${(item.count / maxWeekPattern) * 100}%` }} /></div>
                  <span>{item.count}</span>
                </button>
              ))}
              {surgeSignals.slice(0, 6).map((item) => (
                <button key={`surge-${item.category}`} type="button" className="analytics-bar-row analytics-row-button" onClick={() => openInsight(`surge-${item.category}`)}>
                  <strong>Surge signal {item.category}</strong>
                  <div className="analytics-bar-track"><span className={`analytics-bar-fill ${item.growth > 25 ? "analytics-bar-fill-danger" : "analytics-bar-fill-default"}`} style={{ width: `${(Math.abs(item.growth) / maxSurgeGrowth) * 100}%` }} /></div>
                  <span>{item.growth.toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {drilldown ? (
        <section id="insight-drilldown-results" className="surface-panel clean-marine-panel">
          <div className="section-header">
            <div>
              <h2>Drilldown Results</h2>
              <p>{drilldownLabel(drilldown)} - {drilldownFaults.length} fault(s)</p>
            </div>
          </div>
          <div className="dashboard-stack">
            {drilldownFaults.slice(0, 40).map((fault) => (
              <article key={`${drilldown}-${fault.id}`} className="dashboard-fault-list-card">
                <div className="panel-head">
                  <div>
                    <h3>{fault.id} - {fault.title}</h3>
                    <p>{fault.locationText}</p>
                  </div>
                  <span className="status-chip status-chip-default">{fault.status}</span>
                </div>
                <div className="meta-row">
                  <span className="tag">Priority: {fault.priority}</span>
                  <span className="tag">Category: {fault.category}</span>
                  <span className="tag">Subcategory: {fault.subCategory ?? "Not set"}</span>
                  <span className="tag">Logged by: {fault.reporterEmail ? adminLabel(fault.reporterEmail) : "Unknown"}</span>
                  <span className="tag">Assigned: {fault.assignedAdminName ?? "Unassigned"}</span>
                </div>
              </article>
            ))}
            {drilldownFaults.length > 40 ? (
              <article className="dashboard-queue-card">
                <p>Showing first 40 records. Use search to refine this drilldown.</p>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
