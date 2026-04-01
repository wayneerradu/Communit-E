import { readFaultNotesStore, readFaultsStore } from "@/lib/fault-store";

export type PublicFaultRecord = {
  id: string;
  title: string;
  ethekwiniReference?: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "escalated" | "in-progress" | "closed" | "archived";
  locationText: string;
  createdAt?: string;
  escalatedAt?: string;
  firstInProgressAt?: string;
  closedAt?: string;
  updatedAt?: string;
  publicNote?: string;
};

function sanitizeRoadOnly(locationText: string) {
  const first = (locationText ?? "").split(",")[0]?.trim() ?? "";
  const withoutNumber = first.replace(/^\d+\s+/, "").trim();
  return withoutNumber || first || "Location pending";
}

export function listPublicFaults(): PublicFaultRecord[] {
  const faults = readFaultsStore();
  const notes = readFaultNotesStore();

  return faults.map((fault) => {
    const publicNote = notes.find(
      (note) => note.faultId === fault.id && note.visibility === "public-safe"
    )?.body;

    return {
      id: fault.id,
      title: fault.title,
      ethekwiniReference: fault.ethekwiniReference,
      category: fault.category,
      priority: fault.priority,
      status: fault.status,
      locationText: sanitizeRoadOnly(fault.locationText),
      createdAt: fault.createdAt,
      escalatedAt: fault.escalatedAt,
      firstInProgressAt: fault.firstInProgressAt,
      closedAt: fault.closedAt,
      updatedAt: fault.updatedAt,
      publicNote
    };
  });
}
