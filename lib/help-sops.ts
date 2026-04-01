import type { HelpArticle } from "@/types/domain";

export const helpSops: HelpArticle[] = [
  {
    id: "sop-admin-overview",
    module: "Admin Dashboard",
    page: "Overview",
    topic: "Run your day from Overview",
    category: "admin",
    keywords: ["overview", "tiles", "priority queue", "global search", "daily workflow"],
    instructions:
      "What this page is for: Your daily command center.\n" +
      "How to use it: Start with the top tiles, then work through Priority Work Queue from highest risk to lowest.\n" +
      "What to click first: Critical Faults, then Pending Residents, then Communication approvals.\n" +
      "Why it matters: It keeps the team focused on the most urgent items without hunting through modules.\n" +
      "Tip: Use Global Search when you already know a name, road, reference number, or project title."
  },
  {
    id: "sop-admin-my-work",
    module: "Admin Dashboard",
    page: "My Work",
    topic: "Work only your assigned items",
    category: "admin",
    keywords: ["my work", "assigned", "personal queue", "faults", "tasks", "approvals"],
    instructions:
      "What this page is for: A focused view of work assigned to the logged-in admin.\n" +
      "How to use it: Clear your My Faults first, then My Project Tasks, then approvals and meeting actions.\n" +
      "When to check it: At least 3 times a day (start, mid, end).\n" +
      "If something is missing: It may be closed, reassigned, or not linked to your account identity yet."
  },
  {
    id: "sop-residents-overview",
    module: "Residents Hub",
    page: "Overview",
    topic: "Monitor resident coverage and data quality",
    category: "residents",
    keywords: ["resident overview", "missing information", "street metrics", "security company"],
    instructions:
      "What this page is for: See community growth and data quality at a glance.\n" +
      "How to use it: Watch active totals, most/least active streets, and missing-information indicators.\n" +
      "Key rule: Update records only after verification to avoid inaccurate stats.\n" +
      "Most common cleanup: Missing email, incomplete address, no security company, no surname."
  },
  {
    id: "sop-residents-find",
    module: "Residents Hub",
    page: "Find a Resident",
    topic: "Search and update resident records safely",
    category: "residents",
    keywords: ["find resident", "search", "profile preview", "edit lock", "audit trail"],
    instructions:
      "What this page is for: Fast resident lookup and controlled updates.\n" +
      "Search supports: First name, surname, full/partial name, mobile/partial mobile, street, security company.\n" +
      "Edit rule: Records are locked by default. Click Edit before changing fields.\n" +
      "Audit rule: All changes are logged in history/governance so edits are traceable."
  },
  {
    id: "sop-residents-map",
    module: "Residents Hub",
    page: "Residents Map",
    topic: "Use the map to manage role and location coverage",
    category: "residents",
    keywords: ["residents map", "pins", "clustering", "role icons", "default center"],
    instructions:
      "What this page is for: Visual location view of residents and role holders.\n" +
      "How to use it: Zoom out for clusters, zoom in for pin detail, click a pin to open related resident actions.\n" +
      "Pin logic: Color/icon reflects resident type (Resident, Admin, Street Captain, Volunteer, Animal Care Volunteer).\n" +
      "If pin is missing: Check resident status is active and address coordinates are saved."
  },
  {
    id: "sop-faults-overview",
    module: "Faults Hub",
    page: "Overview",
    topic: "Track performance and escalation risk",
    category: "faults",
    keywords: ["fault overview", "insights", "aging", "sla", "response time", "closure time"],
    instructions:
      "What this page is for: Insight view of fault volume, speed, risk, and quality.\n" +
      "How to use it: Click tiles/charts to drill into real fault lists.\n" +
      "Best daily sequence: Check critical + aged faults first, then overdue and blocked categories.\n" +
      "Remember: This page is analysis-first; capture happens on Escalate Fault."
  },
  {
    id: "sop-faults-escalate",
    module: "Faults Hub",
    page: "Escalate Fault",
    topic: "Capture and escalate faults correctly",
    category: "faults",
    keywords: ["escalate fault", "ethekwini reference", "priority", "resident link", "google location"],
    instructions:
      "Mandatory fields: Fault title, eThekwini Fault Reference, category/subcategory, priority, location, description.\n" +
      "Reporter flow: Choose Escalate by Admin or Escalate for Resident.\n" +
      "Resident flow: Resident Link appears only when escalation is for resident.\n" +
      "Save behavior: Saving triggers escalation workflow and assignment ownership."
  },
  {
    id: "sop-faults-queue",
    module: "Faults Hub",
    page: "Fault Queue",
    topic: "Operate faults like a service desk",
    category: "faults",
    keywords: ["fault queue", "workspace", "edit", "escalate+", "escalate++", "notes"],
    instructions:
      "What this page is for: Day-to-day fault execution.\n" +
      "How to use it: Pick queue controls, select a fault, then work it in Fault Workspace.\n" +
      "Edit rule: Workspace fields are locked until Edit is clicked.\n" +
      "Escalation rule: Escalate+, Escalate++ appear contextually based on priority and escalation timing.\n" +
      "Governance rule: Notes and status changes are audit-tracked."
  },
  {
    id: "sop-faults-map",
    module: "Faults Hub",
    page: "Fault Map",
    topic: "Use map view for open-fault hotspots",
    category: "faults",
    keywords: ["fault map", "open faults", "icons", "category colors", "clusters"],
    instructions:
      "Map scope: Shows open faults only.\n" +
      "Visual logic: Category controls color, subcategory controls icon.\n" +
      "Cluster behavior: Nearby faults group into numbered clusters until zoomed in.\n" +
      "Missing marker check: Confirm fault location saved from Google address field."
  },
  {
    id: "sop-faults-assigned",
    module: "Faults Hub",
    page: "Assigned to Me",
    topic: "Work your own fault queue quickly",
    category: "faults",
    keywords: ["assigned to me", "my faults", "priority filter", "sla breach"],
    instructions:
      "What this page is for: Personal fault workbench.\n" +
      "Best filter order: Priority, SLA breach, oldest age, last update.\n" +
      "Action tip: Resolve blocked and stale faults first to reduce backlog pressure."
  },
  {
    id: "sop-faults-escalations",
    module: "Faults Hub",
    page: "Escalations",
    topic: "Manage escalation windows and nudges",
    category: "faults",
    keywords: ["escalations", "escalate", "escalate+", "escalate++", "nudges"],
    instructions:
      "What this page is for: Monitor and action faults that are due for escalation.\n" +
      "Layout logic: Faults are grouped by Escalate, Escalate+, and Escalate++ readiness.\n" +
      "Action flow: Click a listed item to open it and continue work in queue/workspace."
  },
  {
    id: "sop-faults-closed",
    module: "Faults Hub",
    page: "Closed Faults",
    topic: "Review closed and archived fault history",
    category: "faults",
    keywords: ["closed faults", "archived faults", "reopen"],
    instructions:
      "What this page is for: Historical and closure quality review.\n" +
      "Scope: Closed and archived items only.\n" +
      "Reopen rule: Use reopen with reason if issue recurs."
  },
  {
    id: "sop-faults-settings",
    module: "Faults Hub",
    page: "Fault Settings",
    topic: "Configure escalation contacts (Super Admin)",
    category: "faults",
    keywords: ["fault settings", "superadmin", "contacts", "subcategory routing", "email groups"],
    instructions:
      "Who should use this: Super Admin only.\n" +
      "What to configure: Initial escalation contacts, Escalate+ contacts by subcategory, Escalate++ contacts by subcategory.\n" +
      "Good practice: Keep contacts current when municipal teams change."
  },
  {
    id: "sop-infra-overview",
    module: "Infrastructure Hub",
    page: "Overview",
    topic: "Maintain infrastructure inventory quality",
    category: "infrastructure",
    keywords: ["infrastructure", "assets", "condition", "streetlight", "hydrant", "manhole"],
    instructions:
      "What this page is for: Capture and manage municipal/community asset records.\n" +
      "How to use it: Keep asset type, condition, street, notes, and coordinates accurate.\n" +
      "Why it matters: Map quality depends on complete and consistent asset data."
  },
  {
    id: "sop-infra-map",
    module: "Infrastructure Hub",
    page: "Infrastructure Map",
    topic: "Visualize asset density and type coverage",
    category: "infrastructure",
    keywords: ["infrastructure map", "icons", "clusters", "asset type"],
    instructions:
      "What this page is for: Fast visual status of critical assets.\n" +
      "How to use it: Use clusters at high level, zoom to inspect individual assets.\n" +
      "Visual logic: Different icon and color per asset type."
  },
  {
    id: "sop-projects-overview",
    module: "Projects Hub",
    page: "Overview",
    topic: "Use project intelligence tiles and nudges",
    category: "projects",
    keywords: ["projects overview", "overdue", "stale updates", "oldest project", "most active admin"],
    instructions:
      "What this page is for: Insight view of project and task health.\n" +
      "How to use it: Check blocked/active/aging tiles, then action rotating nudges.\n" +
      "Nudge examples: Overdue tasks, projects older than 30/90 days, no recent updates."
  },
  {
    id: "sop-projects-manager",
    module: "Projects Hub",
    page: "Manager",
    topic: "Create and operate projects/tasks",
    category: "projects",
    keywords: ["projects manager", "project queue", "workspace", "task stack", "edit lock", "priority"],
    instructions:
      "What this page is for: Full project operations.\n" +
      "Project flow: Create project in intake, assign admin, set lane/priority/dates, save.\n" +
      "Task flow: Select project, add tasks, save (task form clears after save).\n" +
      "Workspace flow: Select from queue to open project workspace and stacked task workspace.\n" +
      "Edit safety: Project and task fields are view-only until Edit is clicked."
  },
  {
    id: "sop-projects-my",
    module: "Projects Hub",
    page: "My Projects And Tasks",
    topic: "Work only items linked to you",
    category: "projects",
    keywords: ["my projects and tasks", "all related", "my projects", "my tasks", "assigned"],
    instructions:
      "What this page is for: Personal execution view.\n" +
      "Filter options: All Related, My Projects, My Tasks.\n" +
      "Visibility rule: You see projects you own and projects where you own at least one task."
  },
  {
    id: "sop-projects-reporting",
    module: "Projects Hub",
    page: "Reporting",
    topic: "Generate project report PDFs",
    category: "projects",
    keywords: ["project reporting", "pdf", "export", "project ref"],
    instructions:
      "What this page is for: Build a printable project report with stacked tasks.\n" +
      "How to use it: Choose project, review details, click Export PDF.\n" +
      "Filename logic: Uses project unique ID with safe filename characters."
  },
  {
    id: "sop-pro-playground",
    module: "PRO Hub",
    page: "PlayGround",
    topic: "Draft, approve, and send communications",
    category: "pro",
    keywords: ["pro", "draft", "approval queue", "channel", "media", "holidays"],
    instructions:
      "What this page is for: End-to-end communication workflow.\n" +
      "Core flow: Create draft → Save draft → 2 admin approvals → Send.\n" +
      "Shortcut: Create Draft from holiday/event cards pre-fills headline only.\n" +
      "Governance: Draft owner cannot self-approve."
  },
  {
    id: "sop-pro-donors",
    module: "PRO Hub",
    page: "Donors",
    topic: "Track donor context for campaigns",
    category: "pro",
    keywords: ["donors", "donations", "campaign context"],
    instructions:
      "What this page is for: Keep donor records and donation context visible for outreach planning.\n" +
      "How to use it: Review donor interests, donation totals, and alignment to campaign plans."
  },
  {
    id: "sop-decisions-scheduler",
    module: "Decisions Hub",
    page: "Meeting Scheduler",
    topic: "Schedule meetings with calendar sync",
    category: "meetings",
    keywords: ["meeting scheduler", "calendar", "invites", "attendees"],
    instructions:
      "What this page is for: Create meetings and send invites from shared calendar setup.\n" +
      "How to use it: Capture title, type, agenda, date/time, attendees, then save.\n" +
      "Result: Meeting is created and stored for minuter/action follow-through."
  },
  {
    id: "sop-decisions-minuter",
    module: "Decisions Hub",
    page: "Meeting Minuter",
    topic: "Capture minutes and action items",
    category: "meetings",
    keywords: ["meeting minuter", "minutes", "actions", "owners"],
    instructions:
      "What this page is for: Record decisions and assign actions clearly.\n" +
      "How to use it: Log key notes, add action items, assign owners, update action status."
  },
  {
    id: "sop-decisions-resolutions",
    module: "Decisions Hub",
    page: "Resolutions",
    topic: "Run formal votes and outcomes",
    category: "meetings",
    keywords: ["resolutions", "vote", "quorum", "deadline"],
    instructions:
      "What this page is for: Formal governance voting.\n" +
      "How to use it: Create resolution, set options and deadline, collect votes, monitor quorum."
  },
  {
    id: "sop-decisions-parking-lot",
    module: "Decisions Hub",
    page: "Parking Lot",
    topic: "Move ideas from parking to execution",
    category: "meetings",
    keywords: ["parking lot", "ideas", "threshold", "promote"],
    instructions:
      "What this page is for: Hold ideas until they are ready to act on.\n" +
      "How to use it: Track votes, check threshold, promote to project when approved."
  },
  {
    id: "sop-profile",
    module: "My Profile",
    page: "My Profile",
    topic: "Maintain your profile and visibility",
    category: "profile",
    keywords: ["profile", "bio", "status", "avatar", "presence"],
    instructions:
      "What this page is for: Keep your personal details and presence accurate.\n" +
      "How to use it: Update profile fields, status, and optional bio content."
  },
  {
    id: "sop-vault",
    module: "Vault",
    page: "Vault",
    topic: "Store and classify shared assets",
    category: "admin",
    keywords: ["vault", "assets", "visibility", "documents"],
    instructions:
      "What this page is for: Structured storage for reusable files and references.\n" +
      "How to use it: Add asset metadata, choose category and visibility, keep descriptions clear for search."
  },
  {
    id: "sop-notifications",
    module: "Notifications",
    page: "Notification Center",
    topic: "Process notifications quickly and correctly",
    category: "admin",
    keywords: ["notifications", "drawer", "mark read", "project status", "task status"],
    instructions:
      "What this page is for: Review operational alerts and assignment updates.\n" +
      "How to use it: Work unread first, open linked context, complete action, then mark read.\n" +
      "Context rule: Project/task notifications are targeted to assigned admins."
  },
  {
    id: "sop-help-center",
    module: "Self Help",
    page: "Help Center",
    topic: "Use Self Help effectively",
    category: "admin",
    keywords: ["help center", "sop", "search", "module", "page", "assistant"],
    instructions:
      "What this page is for: SOP knowledge base by module and page.\n" +
      "How to use it: Search by keyword, then expand module, then open page SOP.\n" +
      "Best search terms: escalate, duplicate, overdue, approvals, queue, map, reporting.\n" +
      "Assistant use: This SOP content is structured so it can feed AI guidance."
  },
  {
    id: "sop-super-admin",
    module: "Settings",
    page: "Super Admin",
    topic: "Configure platform-level settings safely",
    category: "super-admin",
    keywords: ["super admin", "integrations", "google", "calendar", "smtp", "session policy"],
    instructions:
      "Who should use this: Super Admin only.\n" +
      "What to manage: Identity, integrations, calendar/mail settings, escalation routing, security and session policies.\n" +
      "Good practice: Change one section at a time and test before moving to the next."
  }
];
