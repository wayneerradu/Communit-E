export type Role = "SUPER_ADMIN" | "ADMIN" | "RESIDENT" | "PRO";

export type FaultStatus = "escalated" | "in-progress" | "closed" | "archived";
export type FaultPriority = "low" | "medium" | "high" | "critical";
export type ResidentStatus = "pending" | "active" | "archived" | "rejected";
export type ResidentType = "resident" | "admin" | "street-captain" | "volunteer" | "animal-care-volunteer";
export type ProjectStatus = "planned" | "active" | "blocked" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type ParkingLotStatus = "open" | "shortlisted" | "promoted" | "archived";
export type PRCommStatus = "draft" | "pending-approval" | "approved" | "sent" | "archived";
export type ResolutionStatus = "open" | "passed" | "rejected" | "closed" | "revote";

export type DashboardCard = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type GlobalSearchItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: "resident" | "fault" | "project" | "infrastructure" | "road" | "meeting" | "resolution" | "communication" | "vault" | "settings" | "donor";
  href?: string;
  keywords?: string[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarImage?: string;
  status?: "active" | "busy" | "dnd" | "vacation" | "offline";
};

export type UserProfile = {
  email: string;
  fullName: string;
  nickname?: string;
  bio?: string;
  dateOfBirth?: string;
  physicalAddress?: string;
  mobileNumber?: string;
  privateNotes?: string;
  delegateEmail?: string;
  status?: "active" | "busy" | "dnd" | "vacation" | "offline";
  avatarImage?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  channel: "in-app" | "telegram" | "email";
  audience: "admins";
  targetEmails?: string[];
  createdAt: string;
  importance?: "critical" | "informational";
  tone?: "default" | "success" | "warning" | "danger";
  readBy?: string[];
};

export type ActiveSession = {
  id: string;
  userEmail: string;
  userName: string;
  role: Role;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: "active" | "idle" | "revoked" | "expired";
  userAgent?: string;
};

export type Resident = {
  id: string;
  name: string;
  standNo: string;
  residentType?: ResidentType;
  email?: string;
  phone?: string;
  securityCompany?: string;
  status: ResidentStatus;
  ward?: string;
  addressLine1?: string;
  suburb?: string;
  latitude?: number;
  longitude?: number;
  profilePic?: string;
  notes?: string;
  addressVerified?: boolean;
  mobileVerified?: boolean;
  whatsappAdded?: boolean;
  consentAccepted?: boolean;
  submittedViaPublicForm?: boolean;
};

export type ResidentHistoryItem = {
  id: string;
  residentId: string;
  title: string;
  detail: string;
  createdAt: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type Fault = {
  id: string;
  title: string;
  ethekwiniReference?: string;
  description: string;
  reporterEmail: string;
  category: string;
  subCategory?: string;
  priority: FaultPriority;
  status: FaultStatus;
  locationText: string;
  latitude?: number;
  longitude?: number;
  mediaRefs?: string[];
  municipalityEmail?: string;
  residentId?: string;
  assignedAdminName?: string;
  loggedByAdminName?: string;
  loggedByAdminEmail?: string;
  internalEscalated?: boolean;
  externalEscalated?: boolean;
  escalationLevel?: "none" | "plus" | "plusplus";
  assignedToEmail?: string;
  assignedAt?: string;
  lastWorkedByEmail?: string;
  lastWorkedAt?: string;
  feedbackStatus?: "pending" | "yes" | "no";
  feedbackRequestedAt?: string;
  feedbackRequestedByEmail?: string;
  overrideReason?: string;
  reopenReason?: string;
  reopenedAt?: string;
  createdAt?: string;
  escalatedAt?: string;
  firstInProgressAt?: string;
  closedAt?: string;
  closedByAdminEmail?: string;
  updatedAt?: string;
  reopenCount?: number;
  escalationCount?: number;
  statusHistory?: Array<{
    status: FaultStatus;
    at: string;
    byEmail?: string;
  }>;
  escalationHistory?: Array<{
    level: "internal" | "external";
    at: string;
    byEmail?: string;
  }>;
};

export type FaultNote = {
  id: string;
  faultId: string;
  body: string;
  createdAt: string;
  authorName: string;
  includeInEmail?: boolean;
  visibility?: "internal" | "public-safe";
  source: "admin" | "mailbox" | "system";
};

export type ParkingLotIdea = {
  id: string;
  title: string;
  justification: string;
  priority: "low" | "medium" | "high";
  status: ParkingLotStatus;
  threshold: number;
  votes: string[];
};

export type ProjectTask = {
  id: string;
  taskRef?: string;
  title: string;
  assignee?: string;
  assigneeEmail?: string;
  dueDate?: string;
  status: "todo" | "started" | "in-progress" | "blocked" | "done";
  createdAt?: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  projectRef?: string;
  title: string;
  description: string;
  assignedAdminEmail?: string;
  assignedAdminName?: string;
  priority?: ProjectPriority;
  createdAt?: string;
  updatedAt?: string;
  budget?: string;
  timelineStart?: string;
  timelineEnd?: string;
  status: ProjectStatus;
  gallery: string[];
  tasks: ProjectTask[];
};

export type PRComm = {
  id: string;
  headline: string;
  body: string;
  channel: string;
  mediaRefs?: string[];
  status: PRCommStatus;
  approvers: string[];
  appCount: number;
  createdAt?: string;
  createdByEmail?: string;
  createdByName?: string;
};

export type SocialCalendarItem = {
  id: string;
  holidayName: string;
  date: string;
  category: string;
  postPlan: string;
  mediaRef?: string;
};

export type ProEventCampaignItem = {
  id: string;
  name: string;
  plannedDate: string;
  description: string;
  plan: string;
  createdAt: string;
  status: "pending-approval" | "approved";
  approvers: string[];
  appCount: number;
  createdByEmail?: string;
  createdByName?: string;
  calendarEventId?: string;
  calendarEventLink?: string;
};

export type Donor = {
  id: string;
  name: string;
  email: string;
  tier: string;
  interests: string;
  totalDonated: string;
};

export type Donation = {
  id: string;
  donorId: string;
  projectId?: string;
  amount: string;
  date: string;
};

export type VaultAsset = {
  id: string;
  assetName: string;
  filePath: string;
  category: string;
  description: string;
  visibility: "all" | "admin" | "pro";
};

export type HelpArticle = {
  id: string;
  module: string;
  page: string;
  topic: string;
  category: string;
  instructions: string;
  keywords?: string[];
};

export type HelpForumThreadType = "question" | "change-request";
export type HelpForumThreadStatus = "open" | "answered" | "implemented" | "closed";

export type HelpForumComment = {
  id: string;
  authorName: string;
  authorEmail: string;
  authorRole: Role;
  body: string;
  createdAt: string;
  editedAt?: string;
};

export type HelpForumThread = {
  id: string;
  module: string;
  page: string;
  title: string;
  type: HelpForumThreadType;
  status: HelpForumThreadStatus;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  comments: HelpForumComment[];
  tags?: string[];
};

export type MeetingMinute = {
  id: string;
  title: string;
  meetingAt: string;
  endAt?: string;
  meetingType?: "operations" | "residents" | "emergency" | "project" | "committee" | "other";
  location?: string;
  organizerEmail?: string;
  googleEventId?: string;
  calendarEventLink?: string;
  requiredAttendees?: string[];
  optionalAttendees?: string[];
  attendees: string[];
  notes: string;
  actionItems: {
    id: string;
    title: string;
    status: "todo" | "in-progress" | "done";
    ownerEmail?: string;
  }[];
};

export type Resolution = {
  id: string;
  title: string;
  description: string;
  type: "yes-no" | "multi-option";
  status: ResolutionStatus;
  deadlineAt: string;
  quorumTarget: number;
  options: string[];
  votes: {
    voter: string;
    choice: string;
  }[];
};

export type InfrastructureAsset = {
  id: string;
  assetName: string;
  assetType:
    | "streetlight-pole"
    | "optic-fiber-pole"
    | "electrical-substation"
    | "electrical-distribution-box"
    | "water-meter"
    | "water-valve"
    | "fire-hydrant"
    | "traffic-light"
    | "manhole";
  condition: string;
  street: string;
  latitude: number;
  longitude: number;
  notes?: string;
  photos: string[];
};

export type PlatformService = {
  id: string;
  name: string;
  status: "healthy" | "warning" | "offline";
  host: string;
  lastRestartAt?: string;
  description: string;
};

export type PlatformConnector = {
  id: string;
  name: string;
  status: "connected" | "warning" | "disconnected";
  lastSyncAt?: string;
  lastError?: string;
  authType: string;
};

export type AutomationJob = {
  id: string;
  name: string;
  cadence: string;
  status: "healthy" | "warning" | "paused";
  lastRunAt?: string;
  nextRunAt?: string;
};

export type FailureItem = {
  id: string;
  title: string;
  area: string;
  severity: "warning" | "danger";
  occurredAt: string;
  detail: string;
};

export type QualityMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type UsageMetric = {
  id: string;
  label: string;
  value: string;
  trend: string;
};

export type TemplateDefinition = {
  id: string;
  name: string;
  area: string;
  status: "active" | "draft";
  lastUpdatedAt: string;
};

export type PublicSurface = {
  id: string;
  name: string;
  visibility: "live" | "maintenance" | "hidden";
  description: string;
};

export type AccessSummary = {
  totalAdmins: number;
  totalSuperAdmins: number;
  inactiveAdmins: number;
  lastAccessReviewAt: string;
};

export type PlatformControlCenter = {
  accessSummary: AccessSummary;
  connectors: PlatformConnector[];
  automationJobs: AutomationJob[];
  failures: FailureItem[];
  qualityMetrics: QualityMetric[];
  usageMetrics: UsageMetric[];
  templates: TemplateDefinition[];
  publicSurfaces: PublicSurface[];
  activeSessions: ActiveSession[];
};

export type PlatformSettings = {
  googleWorkspace: {
    workspaceDomain: string;
    clientId: string;
    allowedDomains: string[];
    callbackUrl: string;
    googleMapsApiKey: string;
    residentsMapDefaultCenter: {
      label: string;
      latitude: number;
      longitude: number;
      zoom: number;
    };
    status: "connected" | "pending";
    clientSecretConfigured: boolean;
  };
  googleCalendar: {
    enabled: boolean;
    syncMode: "read-only" | "read-write";
    calendarName: string;
    calendarId: string;
    connectedAccount: string;
    connectionStatus: "connected" | "pending";
    grantedScopes: string[];
    lastSyncedAt: string;
    refreshTokenConfigured: boolean;
  };
  publicJoinProtection: {
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
    turnstileSecretConfigured: boolean;
    minimumCompletionSeconds: number;
  };
  triageMailbox: {
    address: string;
    mode: "collaborative-inbox";
    senderName: string;
    inboundSync: "planned" | "connected";
    primaryChannel: boolean;
  };
  telegram: {
    botName: string;
    groupName: string;
    botTokenConfigured: boolean;
    chatIdConfigured: boolean;
    status: "connected" | "pending";
  };
  maintenance: {
    modeEnabled: boolean;
    bannerMessage: string;
    allowSuperAdminAccessOnly: boolean;
    lastUpdatedAt: string;
  };
  notificationPolicy: {
    quietHoursStart: string;
    quietHoursEnd: string;
    quietDays: string[];
    telegramCriticalOnly: boolean;
  };
  communicationSettings: {
    email: {
      mode: "off" | "live" | "demo";
      liveRecipients: string[];
      demoRecipients: string[];
    };
    telegram: {
      mode: "off" | "live" | "demo";
      liveGroupName: string;
      liveChatId: string;
      demoGroupName: string;
      demoChatId: string;
      demoBotToken: string;
    };
    councillor: {
      name: string;
      email: string;
      cellNumber: string;
    };
  };
  communicationTemplates: {
    faultInitialEscalation: {
      enabled: boolean;
      subjectTemplate: string;
      bodyTemplate: string;
      signature: string;
    };
    faultEscalatePlus: {
      enabled: boolean;
      subjectTemplate: string;
      bodyTemplate: string;
      signature: string;
    };
    faultEscalatePlusPlus: {
      enabled: boolean;
      subjectTemplate: string;
      bodyTemplate: string;
      signature: string;
    };
    faultReopened: {
      enabled: boolean;
      subjectTemplate: string;
      bodyTemplate: string;
      signature: string;
    };
  };
  sessionPolicy: {
    idleTimeoutMinutes: number;
    absoluteSessionHours: number;
    warnBeforeExpiryMinutes: number;
    allowMultipleSessions: boolean;
  };
  branding: {
    platformFont: string;
    logoMode: "default" | "event";
    emailTheme: string;
    platformSubtitle: string;
    organisationName: string;
    logoImage: string;
  };
  faultEscalation: {
    initialContacts: Array<{
      id: string;
      name: string;
      email: string;
      active: boolean;
    }>;
    escalatePlusBySubCategory: Record<
      string,
      Array<{
        id: string;
        name: string;
        email: string;
        active: boolean;
      }>
    >;
    escalatePlusPlusBySubCategory: Record<
      string,
      Array<{
        id: string;
        name: string;
        email: string;
        active: boolean;
      }>
    >;
  };
  updatedAt: string;
};
