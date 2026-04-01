import { describe, expect, it } from "vitest";
import { approvePRComm, createFault, escalateFault, promoteIdea, sendPRComm, voteForIdea } from "@/lib/workflows";
import { parkingLotIdeas, prComms } from "@/lib/demo-data";

describe("workflow rules", () => {
  it("creates and escalates a fault to critical", () => {
    const fault = createFault({
      title: "Burst pipe outside hall",
      ethekwiniReference: "ETK-001",
      description: "A burst pipe is flooding the pavement outside the hall.",
      reporterEmail: "resident1@example.com",
      category: "water leak",
      locationText: "Main Hall"
    });

    const result = escalateFault(fault.id);

    expect(result.fault.priority).toBe("critical");
    expect(result.fault.internalEscalated).toBe(true);
    expect(result.fault.externalEscalated).toBe(true);
  });

  it("prevents duplicate parking lot votes from changing the count twice", () => {
    const idea = parkingLotIdeas[0];
    const before = idea.votes.length;

    voteForIdea(idea.id, "repeat@example.com");
    voteForIdea(idea.id, "repeat@example.com");

    expect(idea.votes.length).toBe(before + 1);
  });

  it("promotes a parking lot idea into a project", () => {
    const result = promoteIdea("idea-2");
    expect(result.idea.status).toBe("promoted");
    expect(result.project.title).toBe("Install shaded benches near playground");
  });

  it("requires three unique PR approvals before send", () => {
    const item = prComms.find((entry) => entry.id === "pr-1");
    if (!item) {
      throw new Error("Test fixture missing");
    }

    approvePRComm(item.id, "third-admin@example.com");
    expect(item.appCount).toBeGreaterThanOrEqual(3);

    const sent = sendPRComm(item.id);
    expect(sent.status).toBe("sent");
  });
});
