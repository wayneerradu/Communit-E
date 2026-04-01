/**
 * Resident Service — extracted from workflows.ts
 * Import from here for all resident operations.
 */
export {
  listResidents,
  listResidentHistory,
  createResident,
  createPublicResidentApplication,
  updateResidentStatus,
  updateResidentDetails,
  findResidentDuplicate,
  logResidentViewed,
} from "@/lib/workflows";
