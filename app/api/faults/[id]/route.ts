import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  captureFaultFeedback,
  escalateFaultLevel,
  requestFaultResidentFeedback,
  updateFaultDetails,
  updateFaultStatus
} from "@/lib/workflows";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const actor = { name: user.name, email: user.email, role: user.role };

  try {
    if (payload?.action === "escalate-plus" || payload?.action === "escalate-plusplus") {
      const level = payload.action === "escalate-plusplus" ? "plusplus" : "plus";
      const result = escalateFaultLevel(id, level, { actor, expectedUpdatedAt: payload.expectedUpdatedAt });
      return NextResponse.json(result);
    }

    if (payload?.action === "request-feedback") {
      const result = requestFaultResidentFeedback(id, actor);
      return NextResponse.json(result);
    }

    if (payload?.action === "feedback-yes" || payload?.action === "feedback-no") {
      const feedback = payload.action === "feedback-yes" ? "yes" : "no";
      const result = captureFaultFeedback(id, feedback, actor);
      return NextResponse.json(result);
    }

    if (payload?.status) {
      const result = updateFaultStatus(
        id,
        {
          status: payload.status,
          expectedUpdatedAt: payload.expectedUpdatedAt,
          overrideReason: payload.overrideReason,
          reopenReason: payload.reopenReason
        },
        actor
      );
      return NextResponse.json(result);
    }

    const result = updateFaultDetails(id, payload, actor);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update fault." },
      { status: 400 }
    );
  }
}
