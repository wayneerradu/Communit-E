import type {
  DashboardCard,
  Donation,
  Donor,
  Fault,
  FaultNote,
  HelpArticle,
  InfrastructureAsset,
  MeetingMinute,
  PRComm,
  ParkingLotIdea,
  PlatformControlCenter,
  PlatformService,
  PlatformSettings,
  Project,
  Resident,
  Resolution,
  ResidentHistoryItem,
  SessionUser,
  SocialCalendarItem,
  VaultAsset
} from "@/types/domain";

export const currentUser: SessionUser = {
  id: "user-super-admin-1",
  name: "Naledi Mokoena",
  email: "naledi@unityincommunity.org.za",
  role: "SUPER_ADMIN"
};

export const residents: Resident[] = [];

export const residentHistory: ResidentHistoryItem[] = [];

export const faults: Fault[] = [
  {
    id: "fault-1",
    title: "Street lights out near entrance bend",
    ethekwiniReference: "ETK-ELEC-2001",
    description: "Multiple street lights are out on Woodlands Avenue, reducing visibility after dark.",
    reporterEmail: "ops@unityincommunity.org.za",
    category: "electricity",
    subCategory: "Street Light Fault",
    priority: "critical",
    status: "escalated",
    locationText: "112 Woodlands Avenue, Mount Vernon, Durban, 4094",
    latitude: -29.89311,
    longitude: 30.94342,
    assignedAdminName: "Bronwynne Batstone",
    escalationLevel: "none",
    internalEscalated: false,
    externalEscalated: false,
    createdAt: "2026-03-20T07:40:00Z",
    escalatedAt: "2026-03-22T07:45:00Z",
    updatedAt: "2026-03-24T07:45:00Z"
  },
  {
    id: "fault-2",
    title: "Deep pothole reopening after patch",
    ethekwiniReference: "ETK-ROAD-2002",
    description: "Pothole has reopened on Dowland Avenue and is damaging tyres at night.",
    reporterEmail: "admin@unityincommunity.org.za",
    category: "roads",
    subCategory: "Pot Hole",
    priority: "high",
    status: "in-progress",
    locationText: "78 Dowland Avenue, Mount Vernon, Durban, 4094",
    latitude: -29.89324,
    longitude: 30.94308,
    assignedAdminName: "Naledi Mokoena",
    escalationLevel: "plus",
    internalEscalated: true,
    externalEscalated: false,
    createdAt: "2026-03-23T12:10:00Z",
    escalatedAt: "2026-03-23T12:20:00Z",
    firstInProgressAt: "2026-03-24T06:10:00Z",
    updatedAt: "2026-03-27T06:10:00Z"
  },
  {
    id: "fault-3",
    title: "Burst pipe at verge",
    ethekwiniReference: "ETK-WATR-2003",
    description: "Water is flowing continuously from a verge pipe on Norton Road.",
    reporterEmail: "support@unityincommunity.org.za",
    category: "water-management",
    subCategory: "Burst Pipe",
    priority: "high",
    status: "escalated",
    locationText: "41 Norton Road, Mount Vernon, Durban, 4094",
    latitude: -29.89258,
    longitude: 30.94411,
    assignedAdminName: "Peter Khumalo",
    escalationLevel: "plusplus",
    internalEscalated: true,
    externalEscalated: true,
    createdAt: "2026-03-24T05:20:00Z",
    escalatedAt: "2026-03-25T05:25:00Z",
    updatedAt: "2026-03-26T05:25:00Z"
  },
  {
    id: "fault-4",
    title: "Traffic signal stuck flashing",
    ethekwiniReference: "ETK-TRAF-2004",
    description: "Traffic lights on Angle Road are flashing continuously and causing confusion.",
    reporterEmail: "ops@unityincommunity.org.za",
    category: "traffic",
    subCategory: "Flashing",
    priority: "medium",
    status: "in-progress",
    locationText: "9 Angle Road, Mount Vernon, Durban, 4094",
    latitude: -29.89294,
    longitude: 30.94267,
    assignedAdminName: "Bronwynne Batstone",
    escalationLevel: "none",
    internalEscalated: false,
    externalEscalated: false,
    createdAt: "2026-03-22T15:32:00Z",
    escalatedAt: "2026-03-23T15:40:00Z",
    firstInProgressAt: "2026-03-24T08:05:00Z",
    updatedAt: "2026-03-26T08:05:00Z"
  },
  {
    id: "fault-5",
    title: "Stormwater inlet blocked by debris",
    ethekwiniReference: "ETK-STMW-2005",
    description: "Stormwater catchment on Dickens Road is blocked and flooding during rain.",
    reporterEmail: "admin@unityincommunity.org.za",
    category: "stormwater-catchment",
    subCategory: "Damage to Stormwater Infrastructure",
    priority: "medium",
    status: "escalated",
    locationText: "26 Dickens Road, Mount Vernon, Durban, 4094",
    latitude: -29.89406,
    longitude: 30.94386,
    assignedAdminName: "Naledi Mokoena",
    escalationLevel: "plus",
    internalEscalated: true,
    externalEscalated: false,
    createdAt: "2026-03-17T08:05:00Z",
    escalatedAt: "2026-03-18T08:10:00Z",
    updatedAt: "2026-03-19T08:10:00Z"
  },
  {
    id: "fault-6",
    title: "Overgrown verge blocking pavement",
    ethekwiniReference: "ETK-PARK-2006",
    description: "Verges on Philhaven Road are overgrown and obstructing the pavement.",
    reporterEmail: "support@unityincommunity.org.za",
    category: "parks-recreation",
    subCategory: "Verges",
    priority: "low",
    status: "escalated",
    locationText: "15 Philhaven Road, Mount Vernon, Durban, 4094",
    latitude: -29.89449,
    longitude: 30.94294,
    assignedAdminName: "Peter Khumalo",
    escalationLevel: "none",
    internalEscalated: false,
    externalEscalated: false,
    createdAt: "2026-03-20T09:00:00Z",
    escalatedAt: "2026-03-21T09:04:00Z",
    updatedAt: "2026-03-21T09:04:00Z"
  },
  {
    id: "fault-7",
    title: "Sewage odour and overflow",
    ethekwiniReference: "ETK-WSTW-2007",
    description: "Possible main line blockage on Cannon Road with visible wastewater overflow.",
    reporterEmail: "ops@unityincommunity.org.za",
    category: "waste-water",
    subCategory: "Main Line Blockage",
    priority: "critical",
    status: "escalated",
    locationText: "63 Cannon Road, Mount Vernon, Durban, 4094",
    latitude: -29.89197,
    longitude: 30.94444,
    assignedAdminName: "Bronwynne Batstone",
    escalationLevel: "plusplus",
    internalEscalated: true,
    externalEscalated: true,
    createdAt: "2026-03-21T06:05:00Z",
    escalatedAt: "2026-03-22T06:09:00Z",
    updatedAt: "2026-03-28T06:09:00Z"
  },
  {
    id: "fault-8",
    title: "Oil contamination along curb",
    ethekwiniReference: "ETK-POLL-2008",
    description: "Oil residue is spreading along curbside on Woodlands Avenue after a spill.",
    reporterEmail: "admin@unityincommunity.org.za",
    category: "pollution",
    subCategory: "Land Polution Petrol/Oil",
    priority: "medium",
    status: "in-progress",
    locationText: "58 Woodlands Avenue, Mount Vernon, Durban, 4094",
    latitude: -29.89263,
    longitude: 30.94371,
    assignedAdminName: "Naledi Mokoena",
    escalationLevel: "plus",
    internalEscalated: true,
    externalEscalated: false,
    createdAt: "2026-03-23T10:10:00Z",
    escalatedAt: "2026-03-24T10:18:00Z",
    firstInProgressAt: "2026-03-25T07:10:00Z",
    updatedAt: "2026-03-27T07:10:00Z"
  },
  {
    id: "fault-9",
    title: "Damaged streetlight bracket repaired",
    ethekwiniReference: "ETK-ELEC-2009",
    description: "Bracket damage on Woodlands Avenue was repaired and lighting restored.",
    reporterEmail: "ops@unityincommunity.org.za",
    category: "electricity",
    subCategory: "Street Light Fault",
    priority: "medium",
    status: "closed",
    locationText: "94 Woodlands Avenue, Mount Vernon, Durban, 4094",
    latitude: -29.89301,
    longitude: 30.94336,
    assignedAdminName: "Bronwynne Batstone",
    escalationLevel: "plus",
    internalEscalated: true,
    externalEscalated: true,
    createdAt: "2026-03-14T07:20:00Z",
    escalatedAt: "2026-03-14T07:25:00Z",
    firstInProgressAt: "2026-03-15T08:30:00Z",
    closedAt: "2026-03-18T09:50:00Z",
    updatedAt: "2026-03-18T09:50:00Z"
  },
  {
    id: "fault-10",
    title: "Burst hydrant isolated and fixed",
    ethekwiniReference: "ETK-WATR-2010",
    description: "Hydrant leak on Norton Road was isolated and municipal team completed repairs.",
    reporterEmail: "admin@unityincommunity.org.za",
    category: "water-management",
    subCategory: "Leaking Hydrant",
    priority: "high",
    status: "closed",
    locationText: "29 Norton Road, Mount Vernon, Durban, 4094",
    latitude: -29.89267,
    longitude: 30.94403,
    assignedAdminName: "Naledi Mokoena",
    escalationLevel: "plusplus",
    internalEscalated: true,
    externalEscalated: true,
    createdAt: "2026-03-10T05:40:00Z",
    escalatedAt: "2026-03-10T05:45:00Z",
    firstInProgressAt: "2026-03-11T06:20:00Z",
    closedAt: "2026-03-16T13:05:00Z",
    updatedAt: "2026-03-16T13:05:00Z"
  },
  {
    id: "fault-11",
    title: "Pothole case archived after long-term stabilisation",
    ethekwiniReference: "ETK-ROAD-2011",
    description: "Repeated pothole on Dowland Avenue has remained stable after follow-up inspections.",
    reporterEmail: "support@unityincommunity.org.za",
    category: "roads",
    subCategory: "Pot Hole",
    priority: "medium",
    status: "archived",
    locationText: "71 Dowland Avenue, Mount Vernon, Durban, 4094",
    latitude: -29.89334,
    longitude: 30.9432,
    assignedAdminName: "Peter Khumalo",
    escalationLevel: "plus",
    internalEscalated: true,
    externalEscalated: false,
    createdAt: "2026-02-28T09:15:00Z",
    escalatedAt: "2026-02-28T09:22:00Z",
    firstInProgressAt: "2026-03-01T07:35:00Z",
    closedAt: "2026-03-08T10:40:00Z",
    updatedAt: "2026-03-09T10:40:00Z"
  },
  {
    id: "fault-12",
    title: "Stormwater channel clean-up archived",
    ethekwiniReference: "ETK-STMW-2012",
    description: "Stormwater maintenance campaign on Dickens Road completed and archived for reference.",
    reporterEmail: "ops@unityincommunity.org.za",
    category: "stormwater-catchment",
    subCategory: "Flood Damage",
    priority: "low",
    status: "archived",
    locationText: "18 Dickens Road, Mount Vernon, Durban, 4094",
    latitude: -29.89411,
    longitude: 30.94392,
    assignedAdminName: "Bronwynne Batstone",
    escalationLevel: "none",
    internalEscalated: false,
    externalEscalated: false,
    createdAt: "2026-02-18T08:00:00Z",
    escalatedAt: "2026-02-18T08:05:00Z",
    firstInProgressAt: "2026-02-19T07:50:00Z",
    closedAt: "2026-02-24T15:10:00Z",
    updatedAt: "2026-03-02T11:20:00Z"
  }
];

export const faultNotes: FaultNote[] = [];

export const parkingLotIdeas: ParkingLotIdea[] = [];

export const projects: Project[] = [];

export const prComms: PRComm[] = [];

export const socialCalendar: SocialCalendarItem[] = [];

export const donors: Donor[] = [];

export const donations: Donation[] = [];

export const vaultAssets: VaultAsset[] = [];

export const helpArticles: HelpArticle[] = [
  {
    id: "help-super-admin",
    module: "Settings",
    page: "Super Admin",
    topic: "Managing platform integrations",
    category: "super-admin",
    instructions: "Use the Super Admin area to configure Google Workspace identity, the hello mailbox, Telegram alerts, maintenance mode, and service operations."
  },
  {
    id: "help-faults",
    module: "Faults Hub",
    page: "Overview",
    topic: "Escalating a municipal fault",
    category: "faults",
    instructions: "Open the fault, confirm location and category, then use Escalate to notify the senior admin team and municipality."
  },
  {
    id: "help-pro",
    module: "PRO Hub",
    page: "PlayGround",
    topic: "Sending a PR communication",
    category: "pro",
    instructions: "Move the communication to pending approval, collect three distinct admin approvals, then send through the approved channel."
  }
];

export const meetingMinutes: MeetingMinute[] = [];

export const resolutions: Resolution[] = [];

export const infrastructureAssets: InfrastructureAsset[] = [];

export const platformSettings: PlatformSettings = {
  googleWorkspace: {
    workspaceDomain: "unityincommunity.org.za",
    clientId: "985831312071-obule1ie8g026kiundv34nrpc7b6jp0i.apps.googleusercontent.com",
    allowedDomains: ["unityincommunity.org.za"],
    callbackUrl: "http://localhost:3010/api/auth/google/callback",
    googleMapsApiKey: "",
    residentsMapDefaultCenter: {
      label: "Woodlands Avenue, Mount Vernon, Durban 4094",
      latitude: -29.893236,
      longitude: 30.9430801,
      zoom: 16
    },
    status: "pending",
    clientSecretConfigured: false
  },
  googleCalendar: {
    enabled: false,
    syncMode: "read-only",
    calendarName: "Our Shared Calendar",
    calendarId: "c_7d456e5df98e55d048beeb4ef9fd094fd4f3871432ec94abd857a7eb5b3e6a2c@group.calendar.google.com",
    connectedAccount: "hello@unityincommunity.org.za",
    connectionStatus: "pending",
    grantedScopes: ["https://www.googleapis.com/auth/calendar.events"],
    lastSyncedAt: "",
    refreshTokenConfigured: false
  },
  publicJoinProtection: {
    turnstileEnabled: false,
    turnstileSiteKey: "",
    turnstileSecretConfigured: false,
    minimumCompletionSeconds: 3
  },
  triageMailbox: {
    address: "hello@unityincommunity.org.za",
    mode: "collaborative-inbox",
    senderName: "Unity In Community Support",
    inboundSync: "planned",
    primaryChannel: true
  },
  telegram: {
    botName: "CommunitE Ops Bot",
    groupName: "Unity In Community Ops",
    botTokenConfigured: false,
    chatIdConfigured: false,
    status: "pending"
  },
  maintenance: {
    modeEnabled: false,
    bannerMessage: "CommUNIT-E is currently undergoing maintenance. Please check back shortly.",
    allowSuperAdminAccessOnly: true,
    lastUpdatedAt: "2026-03-26T18:05:00Z"
  },
  notificationPolicy: {
    quietHoursStart: "20:00",
    quietHoursEnd: "08:00",
    quietDays: ["SAT", "SUN"],
    telegramCriticalOnly: false
  },
  communicationSettings: {
    email: {
      mode: "live",
      liveRecipients: [],
      demoRecipients: []
    },
    telegram: {
      mode: "live",
      liveGroupName: "Unity In Community Ops",
      liveChatId: "",
      demoGroupName: "Unity In Community Demo Ops",
      demoChatId: "",
      demoBotToken: ""
    },
    councillor: {
      name: "",
      email: "",
      cellNumber: ""
    }
  },
  communicationTemplates: {
    faultInitialEscalation: {
      enabled: true,
      subjectTemplate: "Fault Escalation: {faultRef} - {title}",
      bodyTemplate:
        "Good day,\n\nA fault has been escalated.\n\nFault Ref: {faultRef}\nTitle: {title}\nCategory: {category}\nSub Category: {subCategory}\nPriority: {priority}\nLocation: {location}\nReported By: {reportedBy}\n\nPlease acknowledge and action urgently.\n\nDo not remove the tracking token in this email thread.",
      signature: "Regards,\n{officeBearerName}\nOffice Bearer, Unity In Community\n{officeBearerEmail}"
    },
    faultEscalatePlus: {
      enabled: true,
      subjectTemplate: "Escalate+ Reminder: {faultRef} - {title}",
      bodyTemplate:
        "Good day,\n\nThis fault has reached Escalate+.\n\nFault Ref: {faultRef}\nTitle: {title}\nCategory: {category}\nSub Category: {subCategory}\nPriority: {priority}\nLocation: {location}\nDays Open: {daysOpen}\n\nPlease prioritize this matter.",
      signature: "Regards,\n{officeBearerName}\nOffice Bearer, Unity In Community\n{officeBearerEmail}"
    },
    faultEscalatePlusPlus: {
      enabled: true,
      subjectTemplate: "Escalate++ Management Attention: {faultRef} - {title}",
      bodyTemplate:
        "Good day,\n\nThis fault has reached Escalate++ and requires management attention.\n\nFault Ref: {faultRef}\nTitle: {title}\nCategory: {category}\nSub Category: {subCategory}\nPriority: {priority}\nLocation: {location}\nDays Open: {daysOpen}\n\nPlease advise immediate intervention.",
      signature: "Regards,\n{officeBearerName}\nOffice Bearer, Unity In Community\n{officeBearerEmail}"
    },
    faultReopened: {
      enabled: true,
      subjectTemplate: "Fault Reopened: {faultRef} - {title}",
      bodyTemplate:
        "Good day,\n\nA previously closed fault has been reopened.\n\nFault Ref: {faultRef}\nTitle: {title}\nCategory: {category}\nSub Category: {subCategory}\nPriority: {priority}\nLocation: {location}\nReopen Reason: {reopenReason}\n\nPlease treat this as active and provide updated feedback.",
      signature: "Regards,\n{officeBearerName}\nOffice Bearer, Unity In Community\n{officeBearerEmail}"
    }
  },
  wordpress: {
    enabled: false,
    baseUrl: "",
    username: "",
    appPassword: "",
    defaultStatus: "draft",
    defaultCategory: "News",
    categories: [
      "City Bylaws",
      "Deep Dive",
      "How to Guides",
      "Initiatives",
      "Legacy Projects",
      "Media",
      "Meetings",
      "Monthly Scoredcard",
      "News",
      "Tips"
    ]
  },
  sessionPolicy: {
    idleTimeoutMinutes: 30,
    absoluteSessionHours: 12,
    warnBeforeExpiryMinutes: 5,
    allowMultipleSessions: true
  },
  branding: {
    platformFont: "Aptos",
    logoMode: "default",
    emailTheme: "CommUNIT-E Standard",
    platformSubtitle: "Community Operations Orchestrator",
    organisationName: "Mount Vernon Residents Association",
    logoImage: ""
  },
  faultEscalation: {
    initialContacts: [],
    escalatePlusBySubCategory: {},
    escalatePlusPlusBySubCategory: {}
  },
  updatedAt: "2026-03-26T18:05:00Z"
};

export const platformServices: PlatformService[] = [
  {
    id: "svc-web",
    name: "Web App",
    status: "healthy",
    host: "windows-self-hosted",
    lastRestartAt: "2026-03-26T16:30:00Z",
    description: "Next.js application container serving the internal admin platform."
  },
  {
    id: "svc-db",
    name: "PostgreSQL",
    status: "healthy",
    host: "docker-postgres",
    lastRestartAt: "2026-03-26T16:28:00Z",
    description: "Primary relational database for platform records and audit data."
  },
  {
    id: "svc-mail-sync",
    name: "Mailbox Sync",
    status: "warning",
    host: "planned-service",
    description: "Future inbound sync service for the collaborative inbox and thread ingestion."
  }
];

export const platformControlCenter: PlatformControlCenter = {
  accessSummary: {
    totalAdmins: 8,
    totalSuperAdmins: 2,
    inactiveAdmins: 1,
    lastAccessReviewAt: "2026-03-20T08:30:00Z"
  },
  connectors: [
    {
      id: "con-google",
      name: "Google Workspace",
      status: "connected",
      lastSyncAt: "2026-03-26T17:58:00Z",
      authType: "OAuth"
    },
    {
      id: "con-wordpress",
      name: "WordPress Website",
      status: "warning",
      lastSyncAt: "2026-03-25T10:15:00Z",
      lastError: "Application password rotation due soon",
      authType: "Application Password"
    },
    {
      id: "con-telegram",
      name: "Telegram Bot",
      status: "disconnected",
      lastError: "Chat ID has not been configured yet",
      authType: "Bot Token"
    }
  ],
  automationJobs: [
    {
      id: "job-fault-escalation",
      name: "Fault SLA Escalations",
      cadence: "Every 15 minutes",
      status: "healthy",
      lastRunAt: "2026-03-26T18:00:00Z",
      nextRunAt: "2026-03-26T18:15:00Z"
    },
    {
      id: "job-mailbox-sync",
      name: "Collaborative Inbox Sync",
      cadence: "Every 5 minutes",
      status: "warning",
      lastRunAt: "2026-03-26T17:55:00Z",
      nextRunAt: "2026-03-26T18:00:00Z"
    },
    {
      id: "job-resident-archive",
      name: "Resident Archive Sweep",
      cadence: "Daily at 02:00",
      status: "paused",
      lastRunAt: "2026-03-25T02:00:00Z",
      nextRunAt: "2026-03-27T02:00:00Z"
    }
  ],
  failures: [
    {
      id: "fail-1",
      title: "Mailbox reply match needs review",
      area: "Faults",
      severity: "warning",
      occurredAt: "2026-03-26T16:40:00Z",
      detail: "One inbound email could not be matched confidently to a fault reference."
    },
    {
      id: "fail-2",
      title: "Telegram delivery skipped",
      area: "Notifications",
      severity: "danger",
      occurredAt: "2026-03-26T14:05:00Z",
      detail: "Critical alert queued while Telegram connector is not configured."
    }
  ],
  qualityMetrics: [
    {
      id: "qm-1",
      label: "Residents needing mapping",
      value: "14",
      detail: "Addresses need geocoding or manual pin correction."
    },
    {
      id: "qm-2",
      label: "Assets missing official refs",
      value: "29",
      detail: "Internal IDs exist but municipal references are still unknown."
    },
    {
      id: "qm-3",
      label: "Faults missing photos",
      value: "11",
      detail: "Open faults without supporting media."
    }
  ],
  usageMetrics: [
    {
      id: "um-1",
      label: "Daily active admins",
      value: "7/8",
      trend: "Stable over the last 7 days"
    },
    {
      id: "um-2",
      label: "Assistant requests",
      value: "43",
      trend: "Most requests come from Faults and Residents"
    },
    {
      id: "um-3",
      label: "Exports this month",
      value: "18",
      trend: "Resident exports remain the highest usage"
    }
  ],
  templates: [
    {
      id: "tpl-1",
      name: "Fault First Escalation",
      area: "Faults",
      status: "active",
      lastUpdatedAt: "2026-03-19T09:20:00Z"
    },
    {
      id: "tpl-2",
      name: "Resident Out-of-Area Decline",
      area: "Residents",
      status: "active",
      lastUpdatedAt: "2026-03-18T13:10:00Z"
    },
    {
      id: "tpl-3",
      name: "Media Statement PDF",
      area: "PRO",
      status: "draft",
      lastUpdatedAt: "2026-03-24T08:00:00Z"
    }
  ],
  publicSurfaces: [
    {
      id: "pub-1",
      name: "Resident Application Form",
      visibility: "live",
      description: "Public intake form for new resident applications."
    },
    {
      id: "pub-2",
      name: "Public Fault Dashboard",
      visibility: "live",
      description: "Public-safe dashboard for fault transparency and status checks."
    }
  ],
  activeSessions: [
    {
      id: "sess-1",
      userEmail: "naledi@unityincommunity.org.za",
      userName: "Naledi Mokoena",
      role: "SUPER_ADMIN",
      createdAt: "2026-03-26T16:00:00Z",
      lastActivityAt: "2026-03-26T18:22:00Z",
      expiresAt: "2026-03-27T04:00:00Z",
      status: "active",
      userAgent: "Windows Desktop"
    },
    {
      id: "sess-2",
      userEmail: "peter@unityincommunity.org.za",
      userName: "Peter Khumalo",
      role: "ADMIN",
      createdAt: "2026-03-26T14:30:00Z",
      lastActivityAt: "2026-03-26T15:10:00Z",
      expiresAt: "2026-03-27T02:30:00Z",
      status: "idle",
      userAgent: "Android Mobile"
    }
  ]
};

export function getDashboardCards(): DashboardCard[] {
  const pendingResidents = residents.filter((resident) => resident.status === "pending").length;
  const activeFaults = faults.filter((fault) => fault.status !== "closed" && fault.status !== "archived").length;
  const pendingPR = prComms.filter((item) => item.status === "pending-approval").length;
  const criticalAlerts = faults.filter((fault) => fault.priority === "critical").length;

  return [
    { label: "Pending Residents", value: String(pendingResidents), detail: "Residents awaiting Approval/Rejection", tone: "warning" },
    { label: "Active Faults", value: String(activeFaults), detail: "Number of Active Faults needing Attention", tone: "danger" },
    { label: "Communication need Approval", value: String(pendingPR), detail: "Approve/Reject Comms" },
    { label: "Critical Faults", value: String(criticalAlerts), detail: "High-priority incidents", tone: "danger" }
  ];
}

