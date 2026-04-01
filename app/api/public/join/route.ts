import { NextResponse } from "next/server";
import { z } from "zod";
import { addAdminNotifications } from "@/lib/notification-store";
import { readPlatformSettings } from "@/lib/platform-store";
import { guardPublicJoinSubmission, isPublicJoinSubmissionTooFast } from "@/lib/public-join-guard";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createPublicResidentApplication, findResidentDuplicate } from "@/lib/workflows";
import type { AppNotification } from "@/types/domain";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().regex(/^\+27\d{9}$/),
  securityCompany: z.string().min(2),
  physicalAddress: z.string().min(3),
  consentAccepted: z.literal(true),
  website: z.string().optional().or(z.literal("")),
  startedAt: z.string().optional(),
  turnstileToken: z.string().optional().or(z.literal(""))
});

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "public-join-anon";
}

export async function POST(request: Request) {
  const rawPayload = await request.json();
  const payload = schema.safeParse(rawPayload);

  if (!payload.success) {
    return NextResponse.json({ error: "Please complete all required fields correctly." }, { status: 400 });
  }

  if (payload.data.website) {
    return NextResponse.json({ error: "Unable to process this submission." }, { status: 400 });
  }

  const settings = await readPlatformSettings();

  if (
    isPublicJoinSubmissionTooFast(
      payload.data.startedAt,
      settings.publicJoinProtection.minimumCompletionSeconds
    )
  ) {
    return NextResponse.json(
      { error: "That submission was completed too quickly. Please try again carefully." },
      { status: 400 }
    );
  }

  const rateLimit = await guardPublicJoinSubmission(getClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Please wait about ${rateLimit.retryAfterMinutes} minutes before trying again.` },
      { status: 429 }
    );
  }

  if (settings.publicJoinProtection.turnstileEnabled) {
    if (!settings.publicJoinProtection.turnstileSiteKey) {
      return NextResponse.json(
        { error: "Public form protection is not fully configured yet. Please try again shortly." },
        { status: 503 }
      );
    }

    if (!payload.data.turnstileToken) {
      return NextResponse.json(
        { error: "Please complete the anti-bot verification before submitting." },
        { status: 400 }
      );
    }

    const verification = await verifyTurnstileToken(payload.data.turnstileToken, getClientKey(request));
    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.error ?? "Anti-bot verification failed. Please try again." },
        { status: 400 }
      );
    }
  }

  const duplicate = findResidentDuplicate({
    email: payload.data.email,
    phone: payload.data.phone,
    addressLine1: payload.data.physicalAddress
  });

  if (duplicate) {
    return NextResponse.json(
      {
        error: "We already have an application or resident record matching these details. Please contact an admin if you need help."
      },
      { status: 409 }
    );
  }

  const resident = createPublicResidentApplication({
    name: payload.data.fullName,
    email: payload.data.email,
    phone: payload.data.phone,
    securityCompany: payload.data.securityCompany,
    addressLine1: payload.data.physicalAddress
  });

  const timestamp = new Date().toISOString();
  const notifications: AppNotification[] = [
    {
      id: `notif-${Date.now()}-public-join-app`,
      title: "New Application to Join",
      detail: `${resident.name} submitted the public join form for ${resident.addressLine1}. Review the pending residents queue.`,
      channel: "in-app",
      audience: "admins",
      createdAt: timestamp,
      importance: "informational",
      tone: "warning"
    },
    {
      id: `notif-${Date.now()}-public-join-telegram`,
      title: "New Application to Join",
      detail: `${resident.name} submitted a new application to join from ${resident.addressLine1}.`,
      channel: "telegram",
      audience: "admins",
      createdAt: timestamp,
      importance: "informational",
      tone: "default"
    }
  ];

  await addAdminNotifications(notifications);

  return NextResponse.json({
    item: resident,
    successMessage:
      "Thank you for your application, we have received your application and it is pending review. One of our Friendly Admins will verify your details before adding you to the Community and Utilities Group. In the interim please check out our website on https://www.unityincommunity.org.za."
  });
}
