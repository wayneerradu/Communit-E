import {
  donations,
  donors,
  faults,
  getDashboardCards,
  helpArticles,
  meetingMinutes,
  prComms,
  residents,
  socialCalendar
} from "@/lib/demo-data";
import { readFaultNotesStore, readFaultsStore } from "@/lib/fault-store";
import { syncGoogleCalendarDashboardItems, syncGoogleCalendarPlannerItems, syncPlannerItemsToGoogleCalendar } from "@/lib/google-calendar";
import { helpSops } from "@/lib/help-sops";
import { readMeetingMinutesStore } from "@/lib/meeting-store";
import { readInfrastructureStore } from "@/lib/infrastructure-store";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { listVisibleAdminNotifications } from "@/lib/notification-store";
import { readParkingLotStore } from "@/lib/parking-lot-store";
import { readPlatformControlCenter, readPlatformServices, readPlatformSettings } from "@/lib/platform-store";
import { readProjectsStore } from "@/lib/project-store";
import { readPRCommsStore } from "@/lib/pr-comms-store";
import { readResolutionsStore } from "@/lib/resolution-store";
import { readProEventCampaignStore } from "@/lib/pro-events-store";
import { readResidentHistoryStore, readResidentsStore } from "@/lib/resident-store";
import { readCustomSocialCalendarItems } from "@/lib/social-calendar-custom-store";
import { readVaultStore } from "@/lib/vault-store";
import { getInternationalObservancePlannerItems, getSouthAfricanPublicHolidayPlannerItems } from "@/lib/social-calendar";
import type { AppNotification, DashboardCard, Fault, MeetingMinute, PRComm, Resident } from "@/types/domain";

function mapResidentStatus(status: string): Resident["status"] {
  switch (status) {
    case "PENDING":
      return "pending";
    case "ACTIVE":
      return "active";
    case "REJECTED":
      return "rejected";
    case "LEAVER":
      return "archived"; // domain type doesn't have leaver yet — treat as archived for display
    case "ARCHIVED":
    default:
      return "archived";
  }
}

function mapFaultStatus(status: string): Fault["status"] {
  switch (status) {
    // Legacy values (old schema) — kept for any data that hasn't been migrated
    case "REPORTED":
    case "ASSIGNED":
      return "escalated";
    case "FIXED":
      return "closed";
    // Current enum values (new schema)
    case "ESCALATED":
      return "escalated";
    case "IN_PROGRESS":
      return "in-progress";
    case "CLOSED":
      return "closed";
    case "ARCHIVED":
    default:
      return "archived";
  }
}

function mapFaultPriority(priority: string): Fault["priority"] {
  switch (priority) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    case "CRITICAL":
    default:
      return "critical";
  }
}

function mapResidentRecord(resident: {
  id: string;
  name: string;
  standNo: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  ward: string | null;
  addressLine1: string | null;
  suburb: string;
  latitude: number | null;
  longitude: number | null;
  profilePic: string | null;
  notes: string | null;
}): Resident {
  return {
    id: resident.id,
    name: resident.name,
    standNo: resident.standNo ?? "",
    email: resident.email ?? undefined,
    phone: resident.phone ?? undefined,
    status: mapResidentStatus(resident.status),
    ward: resident.ward ?? undefined,
    addressLine1: resident.addressLine1 ?? undefined,
    suburb: resident.suburb ?? undefined,
    latitude: resident.latitude ?? undefined,
    longitude: resident.longitude ?? undefined,
    profilePic: resident.profilePic ?? undefined,
    notes: resident.notes ?? undefined
  };
}

function mapFaultRecord(fault: {
  id: string;
  title: string;
  description: string;
  reporterEmail: string;
  category: string;
  priority: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  locationText: string | null;
  municipalityEmail: string | null;
  residentId: string | null;
}): Fault {
  return {
    id: fault.id,
    title: fault.title,
    description: fault.description,
    reporterEmail: fault.reporterEmail,
    category: fault.category,
    priority: mapFaultPriority(fault.priority),
    status: mapFaultStatus(fault.status),
    latitude: fault.latitude ?? undefined,
    longitude: fault.longitude ?? undefined,
    locationText: fault.locationText ?? "Location pending",
    municipalityEmail: fault.municipalityEmail ?? undefined,
    residentId: fault.residentId ?? undefined
  };
}

function mapPrStatus(status: string): PRComm["status"] {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "PENDING_APPROVAL":
      return "pending-approval";
    case "APPROVED":
      return "approved";
    case "SENT":
      return "sent";
    case "ARCHIVED":
    default:
      return "archived";
  }
}

function createDashboardCards(pendingResidentsCount: number, activeFaultsCount: number, prQueueCount: number, minutesCount: number): DashboardCard[] {
  return [
    {
      label: "Pending Residents",
      value: pendingResidentsCount.toString(),
      detail: "Residents awaiting Approval/Rejection",
      tone: pendingResidentsCount > 0 ? "warning" : "default"
    },
    {
      label: "Active Faults",
      value: activeFaultsCount.toString(),
      detail: "Number of Active Faults needing Attention",
      tone: activeFaultsCount > 0 ? "danger" : "success"
    },
    {
      label: "Communication need Approval",
      value: prQueueCount.toString(),
      detail: "Approve/Reject Comms",
      tone: prQueueCount > 0 ? "warning" : "success"
    },
    {
      label: "Critical Faults",
      value: minutesCount.toString(),
      detail: "High-priority incidents",
      tone: minutesCount > 0 ? "danger" : "success"
    }
  ];
}

export async function getDashboardData(userEmail?: string) {
  const adminNotifications = userEmail ? await listVisibleAdminNotifications(userEmail) : [];
  const calendarItems = await syncGoogleCalendarDashboardItems().catch(() => []);

  if (!isDatabaseConfigured()) {
    const storedResidents = readResidentsStore();
    const storedFaults = readFaultsStore();
    const storedPRComms = readPRCommsStore();
    const storedMinutes = readMeetingMinutesStore();
    const pendingResidents = storedResidents.filter((resident) => resident.status === "pending");
    const activeFaults = storedFaults.filter((fault) => fault.status !== "closed" && fault.status !== "archived");
    const prQueue = storedPRComms.filter((item) => item.status === "pending-approval" || item.status === "approved");
    return {
      cards: createDashboardCards(
        pendingResidents.length,
        activeFaults.length,
        prQueue.length,
        activeFaults.filter((fault) => fault.priority === "critical").length
      ),
      pendingResidents,
      activeFaults,
      prQueue,
      minutes: storedMinutes,
      calendarItems,
      notifications: adminNotifications.slice(0, 4)
    };
  }

  try {
    const [residentRows, faultRows, prRows, minuteRows] = await Promise.all([
      prisma.resident.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.fault.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.pRComm.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.meetingMinute.findMany({
        orderBy: { meetingAt: "desc" },
        take: 3
      })
    ]);

    const mappedResidents = residentRows.map(mapResidentRecord);
    const mappedFaults = faultRows.map(mapFaultRecord);
    const mappedPrQueue: PRComm[] = prRows.map((item) => ({
      id: item.id,
      headline: item.headline,
      body: item.body,
      channel: item.channel,
      status: mapPrStatus(item.status),
      approvers: [],
      appCount: item.appCount
    }));
    const mappedMinutes: MeetingMinute[] = minuteRows.map((item) => ({
      id: item.id,
      title: item.title,
      meetingAt: item.meetingAt.toISOString(),
      attendees: Array.isArray(item.attendees)
        ? item.attendees
        : (item.attendees as string).split(",").map((e) => e.trim()).filter(Boolean),
      notes: item.notes,
      actionItems: []
    }));

    const pendingResidents = mappedResidents.filter((resident) => resident.status === "pending");
    const activeFaults = mappedFaults.filter((fault) => fault.status !== "closed" && fault.status !== "archived");
    const prQueue = mappedPrQueue.filter((item) => item.status === "pending-approval" || item.status === "approved");

    return {
      cards: createDashboardCards(
        pendingResidents.length,
        activeFaults.length,
        prQueue.length,
        activeFaults.filter((fault) => fault.priority === "critical").length
      ),
      pendingResidents,
      activeFaults,
      prQueue,
      minutes: mappedMinutes,
      calendarItems,
      notifications: adminNotifications.slice(0, 4)
    };
  } catch {
    const storedResidents = readResidentsStore();
    const storedFaults = readFaultsStore();
    const storedPRComms = readPRCommsStore();
    const storedMinutes = readMeetingMinutesStore();
    const pendingResidents = storedResidents.filter((resident) => resident.status === "pending");
    const activeFaults = storedFaults.filter((fault) => fault.status !== "closed" && fault.status !== "archived");
    const prQueue = storedPRComms.filter((item) => item.status === "pending-approval" || item.status === "approved");
    return {
      cards: createDashboardCards(
        pendingResidents.length,
        activeFaults.length,
        prQueue.length,
        activeFaults.filter((fault) => fault.priority === "critical").length
      ),
      pendingResidents,
      activeFaults,
      prQueue,
      minutes: storedMinutes,
      calendarItems,
      notifications: adminNotifications.slice(0, 4)
    };
  }
}

export async function getResidentsData() {
  if (!isDatabaseConfigured()) {
    const storedResidents = readResidentsStore();
    const storedHistory = readResidentHistoryStore();
    return {
      residents: storedResidents,
      residentMapPins: storedResidents.filter((resident) => resident.status === "active" && resident.latitude && resident.longitude),
      history: storedHistory
    };
  }

  try {
    const residentRows = await prisma.resident.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });
    const mappedResidents = residentRows.map(mapResidentRecord);

    return {
      residents: mappedResidents,
      residentMapPins: mappedResidents.filter((resident) => resident.status === "active" && resident.latitude && resident.longitude),
      history: []
    };
  } catch {
    const storedResidents = readResidentsStore();
    const storedHistory = readResidentHistoryStore();
    return {
      residents: storedResidents,
      residentMapPins: storedResidents.filter((resident) => resident.status === "active" && resident.latitude && resident.longitude),
      history: storedHistory
    };
  }
}

export function getFaultsData() {
  return { faults: readFaultsStore(), notes: readFaultNotesStore() };
}

export function getInfrastructureData() {
  return { assets: readInfrastructureStore() };
}

export function getProjectsData() {
  return { projects: readProjectsStore(), parkingLotIdeas: readParkingLotStore() };
}

export function getMeetingsData() {
  return { minutes: readMeetingMinutesStore() };
}

export function getResolutionsData() {
  return { resolutions: readResolutionsStore() };
}

export async function getProData() {
  const socialCalendar = await getSouthAfricanPublicHolidayPlannerItems().catch(() => []);
  const internationalObservances = await getInternationalObservancePlannerItems().catch(() => []);
  const customObservances = await readCustomSocialCalendarItems().catch(() => []);
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const mergedObservances = [...internationalObservances, ...customObservances]
    .filter((item) => item.date.startsWith(`${currentYear}-`) && item.date >= todayKey)
    .sort((left, right) => left.date.localeCompare(right.date));
  const plannerItemsForCalendar = [...socialCalendar, ...mergedObservances].map((item) => {
    const [, description = ""] = item.postPlan.split("|||");

    return {
      id: item.id,
      title: item.holidayName,
      date: item.date,
      category: item.category,
      description
    };
  });

  await syncPlannerItemsToGoogleCalendar(plannerItemsForCalendar).catch(() => {});
  const plannerEvents = await syncGoogleCalendarPlannerItems().catch(() => []);
  const eventCampaigns = await readProEventCampaignStore().catch(() => []);
  const platformSettings = await readPlatformSettings();

  return {
    prComms: readPRCommsStore(),
    socialCalendar,
    internationalObservances: mergedObservances,
    plannerEvents,
    eventCampaigns,
    wordpress: platformSettings.wordpress,
    donors,
    donations
  };
}

export function getVaultData() {
  return { vaultAssets: readVaultStore() };
}

export function getHelpData(category?: string) {
  const normalizedCategory = category?.trim().toLowerCase();
  return {
    articles: normalizedCategory
      ? helpSops.filter(
          (article) =>
            article.category.toLowerCase() === normalizedCategory ||
            article.module.toLowerCase() === normalizedCategory
        )
      : helpSops
  };
}

export async function getSuperAdminData() {
  return {
    settings: await readPlatformSettings(),
    services: await readPlatformServices(),
    controlCenter: await readPlatformControlCenter()
  };
}
