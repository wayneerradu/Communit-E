/**
 * Fault Service — extracted from workflows.ts
 * Import from here for all fault operations.
 */
export {
  listFaults,
  listFaultNotes,
  createFault,
  escalateFault,
  escalateFaultLevel,
  updateFaultStatus,
  updateFaultDetails,
  requestFaultResidentFeedback,
  captureFaultFeedback,
  addFaultNote,
  canEscalateFaultLevel,
} from "@/lib/workflows";
