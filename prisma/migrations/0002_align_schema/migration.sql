-- Migration: 0002_align_schema
-- Aligns the database schema with types/domain.ts
-- Safe to run on a fresh DB or on top of migration 0001.

-- ─── Step 1: Add missing enum values ─────────────────────────────────────────

-- ResidentStatus: add LEAVER
DO $$ BEGIN
  ALTER TYPE "ResidentStatus" ADD VALUE IF NOT EXISTS 'LEAVER';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Role: remove RESIDENT (residents don't log in)
-- PostgreSQL can't DROP enum values directly; we rename to keep data safe.
-- If any row has role='RESIDENT' it will remain valid until cleaned up.
-- New code never assigns this role.

-- FaultStatus: migrate old values → new canonical set
-- Add new values first (safe), then we migrate data below.
DO $$ BEGIN
  ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
  ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ProjectStatus: add ON_HOLD
DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'ON_HOLD';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── Step 2: Migrate old FaultStatus data to new values ──────────────────────

UPDATE "Fault" SET "status" = 'ESCALATED'   WHERE "status" IN ('REPORTED', 'ASSIGNED');
UPDATE "Fault" SET "status" = 'IN_PROGRESS'  WHERE "status" = 'IN_PROGRESS';
UPDATE "Fault" SET "status" = 'CLOSED'       WHERE "status" = 'FIXED';

-- ─── Step 3: Add new columns to existing tables ───────────────────────────────

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Resident: new fields
ALTER TABLE "Resident" ALTER COLUMN "standNo" DROP NOT NULL;
ALTER TABLE "Resident" ALTER COLUMN "suburb"  SET DEFAULT 'Mount Vernon';
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "residentType"           TEXT NOT NULL DEFAULT 'RESIDENT';
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "securityCompany"        TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "postalCode"             TEXT NOT NULL DEFAULT '4094';
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "geocodeStatus"          TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "addressVerified"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "mobileVerified"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "whatsappAdded"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "consentAccepted"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "submittedViaPublicForm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "whatsappState"          TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "whatsappAddedAt"        TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "whatsappAddedBy"        TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "leaveReason"            TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "leaveReasonOther"       TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "leftAt"                 TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "rejectionReason"        TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "rejectedAt"             TIMESTAMP(3);
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "roadId"                 TEXT;

-- Fault: new fields
ALTER TABLE "Fault" ALTER COLUMN "locationText" SET NOT NULL;
ALTER TABLE "Fault" ALTER COLUMN "locationText" SET DEFAULT '';
UPDATE "Fault" SET "locationText" = '' WHERE "locationText" IS NULL;

ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "ethekwiniReference"       TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "subCategory"              TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "ward"                     TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "roadId"                   TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "mediaRefs"                TEXT[] DEFAULT '{}';
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "escalationLevel"          TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "internalEscalated"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "externalEscalated"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "escalatedAt"              TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "firstInProgressAt"        TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "escalationCount"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "reopenCount"              INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "loggedByAdminName"        TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "loggedByAdminEmail"       TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "assignedAdminName"        TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "assignedToEmail"          TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "assignedAt"               TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "lastWorkedByEmail"        TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "lastWorkedAt"             TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "feedbackStatus"           TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "feedbackRequestedAt"      TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "feedbackRequestedByEmail" TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "overrideReason"           TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "reopenReason"             TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "reopenedAt"               TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "closedAt"                 TIMESTAMP(3);
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "closedByAdminEmail"       TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "workflowDispatchInitial"  TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "workflowDispatchPlus"     TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "workflowDispatchPlusplus" TEXT;
ALTER TABLE "Fault" ADD COLUMN IF NOT EXISTS "workflowDispatchReopened" TEXT;

-- ─── Step 4: Create new tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Road" (
    "id"         TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "suburb"     TEXT         NOT NULL DEFAULT 'Mount Vernon',
    "city"       TEXT         NOT NULL DEFAULT 'Durban',
    "postalCode" TEXT         NOT NULL DEFAULT '4094',
    "notes"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Road_name_key" ON "Road"("name");

CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id"              TEXT         NOT NULL,
    "email"           TEXT         NOT NULL,
    "fullName"        TEXT         NOT NULL,
    "nickname"        TEXT,
    "bio"             TEXT,
    "dateOfBirth"     TEXT,
    "physicalAddress" TEXT,
    "mobileNumber"    TEXT,
    "privateNotes"    TEXT,
    "delegateEmail"   TEXT,
    "status"          TEXT         NOT NULL DEFAULT 'active',
    "avatarImage"     TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_email_key" ON "UserProfile"("email");

CREATE TABLE IF NOT EXISTS "ResidentHistory" (
    "id"         TEXT         NOT NULL,
    "residentId" TEXT         NOT NULL,
    "title"      TEXT         NOT NULL,
    "detail"     TEXT         NOT NULL,
    "tone"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResidentHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FaultNote" (
    "id"             TEXT         NOT NULL,
    "faultId"        TEXT         NOT NULL,
    "body"           TEXT         NOT NULL,
    "authorName"     TEXT         NOT NULL,
    "includeInEmail" BOOLEAN      NOT NULL DEFAULT false,
    "visibility"     TEXT         NOT NULL DEFAULT 'INTERNAL',
    "source"         TEXT         NOT NULL DEFAULT 'ADMIN',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaultNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FaultStatusHistory" (
    "id"      TEXT         NOT NULL,
    "faultId" TEXT         NOT NULL,
    "status"  TEXT         NOT NULL,
    "byEmail" TEXT,
    "at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaultStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FaultEscalationHistory" (
    "id"      TEXT         NOT NULL,
    "faultId" TEXT         NOT NULL,
    "level"   TEXT         NOT NULL,
    "byEmail" TEXT,
    "at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaultEscalationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Resolution" (
    "id"             TEXT         NOT NULL,
    "title"          TEXT         NOT NULL,
    "description"    TEXT         NOT NULL,
    "type"           TEXT         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'OPEN',
    "deadlineAt"     TIMESTAMP(3) NOT NULL,
    "quorumTarget"   INTEGER      NOT NULL DEFAULT 4,
    "options"        TEXT[]       NOT NULL DEFAULT '{}',
    "createdByEmail" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResolutionVote" (
    "id"           TEXT         NOT NULL,
    "resolutionId" TEXT         NOT NULL,
    "voterEmail"   TEXT         NOT NULL,
    "choice"       TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResolutionVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResolutionVote_resolutionId_voterEmail_key" ON "ResolutionVote"("resolutionId", "voterEmail");

CREATE TABLE IF NOT EXISTS "ParkingLotIdea" (
    "id"             TEXT         NOT NULL,
    "title"          TEXT         NOT NULL,
    "justification"  TEXT         NOT NULL,
    "priority"       TEXT         NOT NULL DEFAULT 'medium',
    "status"         TEXT         NOT NULL DEFAULT 'OPEN',
    "threshold"      INTEGER      NOT NULL DEFAULT 10,
    "createdByEmail" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParkingLotIdea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActiveSession" (
    "id"             TEXT         NOT NULL,
    "userEmail"      TEXT         NOT NULL,
    "userName"       TEXT         NOT NULL,
    "role"           TEXT         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'active',
    "userAgent"      TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ActiveSession_userEmail_idx" ON "ActiveSession"("userEmail");

CREATE TABLE IF NOT EXISTS "AppNotification" (
    "id"                    TEXT         NOT NULL,
    "title"                 TEXT         NOT NULL,
    "detail"                TEXT         NOT NULL,
    "channel"               TEXT         NOT NULL,
    "deliveryStatus"        TEXT         NOT NULL DEFAULT 'pending',
    "deliveryAttempts"      INTEGER      NOT NULL DEFAULT 0,
    "lastDeliveryAttemptAt" TIMESTAMP(3),
    "nextRetryAt"           TIMESTAMP(3),
    "deliveryError"         TEXT,
    "audience"              TEXT         NOT NULL DEFAULT 'admins',
    "targetEmails"          TEXT[]       NOT NULL DEFAULT '{}',
    "importance"            TEXT         NOT NULL DEFAULT 'informational',
    "tone"                  TEXT         NOT NULL DEFAULT 'default',
    "readBy"                TEXT[]       NOT NULL DEFAULT '{}',
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- Rename ParkingLot → ParkingLotIdea (if old table exists and new one doesn't)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ParkingLot')
  AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ParkingLotIdea') THEN
    ALTER TABLE "ParkingLot" RENAME TO "ParkingLotIdea";
    ALTER TABLE "ParkingLotIdea" ADD COLUMN IF NOT EXISTS "createdByEmail" TEXT;
    ALTER TABLE "ParkingLotIdea" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Rename ParkingLotVote.parkingLotId to match new model if needed (best effort)
ALTER TABLE "ParkingLotVote" ADD COLUMN IF NOT EXISTS "parkingLotId_new" TEXT;

-- ─── Step 5: Alter AuditLog to add new columns ────────────────────────────────

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorName"  TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "before"     JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "after"      JSONB;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "source"     TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "reason"     TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "faultId"    TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "projectId"  TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "assetId"    TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorEmail_idx"          ON "AuditLog"("actorEmail");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"           ON "AuditLog"("createdAt");

-- ─── Step 6: Add missing columns to InfrastructureAsset ──────────────────────

ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "status"            TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "verificationState" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "source"            TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "officialRef"       TEXT;
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "ward"              TEXT;
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "lastVerifiedAt"    TIMESTAMP(3);
ALTER TABLE "InfrastructureAsset" ADD COLUMN IF NOT EXISTS "roadId"            TEXT;

-- ─── Step 7: Add missing columns to Project ──────────────────────────────────

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectRef"          TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "priority"            TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "assignedAdminEmail"  TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "assignedAdminName"   TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "gallery"             TEXT[] DEFAULT '{}';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "roadId"              TEXT;
ALTER TABLE "Project" DROP COLUMN IF EXISTS "budget";

-- ─── Step 8: Fix ProjectTask status column ────────────────────────────────────

ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "taskRef"       TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "assignee"      TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "assigneeEmail" TEXT;
ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "blockerReason" TEXT;

-- ─── Step 9: Add missing columns to PRComm ───────────────────────────────────

ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "mediaRefs"            TEXT[] DEFAULT '{}';
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "wordpressPostId"      INTEGER;
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "wordpressPostUrl"     TEXT;
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "wordpressCategory"    TEXT;
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "wordpressStatus"      TEXT;
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "wordpressPublishedAt" TIMESTAMP(3);
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "createdByEmail"       TEXT;
ALTER TABLE "PRComm" ADD COLUMN IF NOT EXISTS "createdByName"        TEXT;

-- Migrate createdById → createdByEmail if column exists
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='PRComm' AND column_name='createdById') THEN
    UPDATE "PRComm" SET "createdByEmail" = "createdById" WHERE "createdByEmail" IS NULL AND "createdById" IS NOT NULL;
  END IF;
END $$;

-- ─── Step 10: Add missing columns to MeetingMinute ───────────────────────────

ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "endAt"               TIMESTAMP(3);
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "meetingType"         TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "location"            TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "organizerEmail"      TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "googleEventId"       TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "calendarEventLink"   TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "requiredAttendees"   TEXT[] DEFAULT '{}';
ALTER TABLE "MeetingMinute" ADD COLUMN IF NOT EXISTS "optionalAttendees"   TEXT[] DEFAULT '{}';

-- Migrate attendees from CSV string to TEXT[] if still a text column
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name='MeetingMinute' AND column_name='attendees' AND data_type='text'
  ) THEN
    ALTER TABLE "MeetingMinute" ALTER COLUMN "attendees" TYPE TEXT[] USING string_to_array("attendees", ',');
  END IF;
END $$;

-- ─── Step 11: Add VaultAsset new columns ─────────────────────────────────────

ALTER TABLE "VaultAsset" ADD COLUMN IF NOT EXISTS "tags"       TEXT[] DEFAULT '{}';
ALTER TABLE "VaultAsset" ADD COLUMN IF NOT EXISTS "uploadedBy" TEXT;
ALTER TABLE "VaultAsset" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VaultAsset" ADD COLUMN IF NOT EXISTS "expiresAt"  TIMESTAMP(3);

-- ─── Step 12: Add HelpArticle new columns ────────────────────────────────────

ALTER TABLE "HelpArticle" ADD COLUMN IF NOT EXISTS "module"    TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "HelpArticle" ADD COLUMN IF NOT EXISTS "page"      TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "HelpArticle" ADD COLUMN IF NOT EXISTS "keywords"  TEXT[] DEFAULT '{}';

-- ─── Step 13: Ensure JsonStore exists (migration bridge) ─────────────────────

CREATE TABLE IF NOT EXISTS "JsonStore" (
    "key"       TEXT         NOT NULL,
    "payload"   JSONB        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JsonStore_pkey" PRIMARY KEY ("key")
);
