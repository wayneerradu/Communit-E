import { beforeEach, describe, expect, it } from "vitest";
import { approvePRComm, createFault, escalateFault, promoteIdea, sendPRComm, voteForIdea } from "@/lib/workflows";
import { writeFaultsStore } from "@/lib/fault-store";
import { readParkingLotStore, writeParkingLotStore } from "@/lib/parking-lot-store";
import { readProjectsStore, writeProjectsStore } from "@/lib/project-store";
import { readPRCommsStore, writePRCommsStore } from "@/lib/pr-comms-store";
import type { ParkingLotIdea, PRComm } from "@/types/domain";

beforeEach(() => {
  writeFaultsStore([]);
  writeProjectsStore([]);
  writeParkingLotStore([
    {
      id: "idea-test-1",
      title: "Install shaded benches near playground",
      justification: "Residents need shaded seating in summer.",
      priority: "medium",
      status: "open",
      threshold: 10,
      votes: []
    } satisfies ParkingLotIdea
  ]);
  writePRCommsStore([
    {
      id: "pr-test-1",
      headline: "Weekend cleanup drive",
      body: "Please join the cleanup drive this Saturday.",
      channel: "whatsapp",
      status: "draft",
      approvers: [],
      appCount: 0
    } satisfies PRComm
  ]);
});

describe("workflow rules", () => {
  it("creates and escalates a high-priority fault to Escalate+", () => {
    const fault = createFault({
      title: "Burst pipe outside hall",
      ethekwiniReference: "ETK-001",
      description: "A burst pipe is flooding the pavement outside the hall.",
      reporterEmail: "resident1@example.com",
      category: "water leak",
      priority: "high",
      locationText: "Main Hall"
    });

    const result = escalateFault(fault.id);

    expect(result.fault.priority).toBe("high");
    expect(result.fault.escalationLevel).toBe("plus");
    expect(result.fault.internalEscalated).toBe(true);
    expect(result.fault.externalEscalated).toBeFalsy();
  });

  it("prevents duplicate parking lot votes from changing the count twice", () => {
    const ideaId = "idea-test-1";
    const before = readParkingLotStore().find((item) => item.id === ideaId)?.votes.length ?? 0;

    voteForIdea(ideaId, "repeat@example.com");
    voteForIdea(ideaId, "repeat@example.com");

    const stored = readParkingLotStore().find((item) => item.id === ideaId);
    expect(stored?.votes.length).toBe(before + 1);
  });

  it("promotes a parking lot idea into a project", () => {
    const result = promoteIdea("idea-test-1");
    expect(result.idea.status).toBe("promoted");
    expect(result.project.title).toBe("Install shaded benches near playground");
    expect(readProjectsStore().some((project) => project.id === result.project.id)).toBe(true);
  });

  it("requires two unique PR approvals before send", () => {
    const item = readPRCommsStore().find((entry) => entry.id === "pr-test-1");
    if (!item) {
      throw new Error("Test fixture missing");
    }

    approvePRComm(item.id, { email: "admin-one@example.com", role: "ADMIN", name: "Admin One" });
    approvePRComm(item.id, { email: "admin-two@example.com", role: "ADMIN", name: "Admin Two" });
    expect(item.appCount).toBeGreaterThanOrEqual(2);

    const sent = sendPRComm(item.id);
    expect(sent.status).toBe("sent");
  });
});
