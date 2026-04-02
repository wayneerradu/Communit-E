-- Migration: 0002_align_schema
-- Part 1: Add missing enum values ONLY.
-- PostgreSQL requires enum ADD VALUE to be committed before the new values
-- can be used in the same session. All data/column work is in 0003_align_schema_data.

-- ResidentStatus: add LEAVER
ALTER TYPE "ResidentStatus" ADD VALUE IF NOT EXISTS 'LEAVER';

-- FaultStatus: add new canonical values
ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "FaultStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

-- ProjectStatus: add ON_HOLD
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'ON_HOLD';
