import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getConfiguredWorkspaceUsers, toSessionUser } from "@/lib/identity";
import { addAdminNotifications } from "@/lib/notification-store";
import { readUserProfile, upsertUserProfile } from "@/lib/user-profile-store";
import type { AppNotification } from "@/types/domain";

const schema = z.object({
  avatarImage: z.string().optional(),
  nickname: z.string().optional(),
  bio: z.string().optional(),
  dateOfBirth: z.string().optional(),
  physicalAddress: z.string().optional(),
  mobileNumber: z.string().optional(),
  privateNotes: z.string().optional(),
  delegateEmail: z.string().email().nullable().optional(),
  status: z.enum(["active", "busy", "dnd", "vacation", "offline"]).optional()
});

function findDisplayName(email: string, fallback = "Selected delegate") {
  const knownUser = getConfiguredWorkspaceUsers().find((item) => item.email.toLowerCase() === email.toLowerCase());
  return knownUser?.name || fallback;
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await readUserProfile(user.email);
  return NextResponse.json({
    item: {
      email: user.email,
      fullName: user.name,
      nickname: profile?.nickname ?? "",
      bio: profile?.bio ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      physicalAddress: profile?.physicalAddress ?? "",
      mobileNumber: profile?.mobileNumber ?? "",
      privateNotes: profile?.privateNotes ?? "",
      delegateEmail: profile?.delegateEmail ?? "",
      status: profile?.status ?? "active",
      avatarImage: profile?.avatarImage ?? ""
    }
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = schema.parse(await request.json());
  const existingProfile = await readUserProfile(user.email);
  const previousDelegateEmail = existingProfile?.delegateEmail?.trim().toLowerCase() ?? "";
  const profile = await upsertUserProfile({
    email: user.email,
    fullName: user.name,
    nickname: payload.nickname ?? existingProfile?.nickname ?? "",
    bio: payload.bio ?? existingProfile?.bio ?? "",
    dateOfBirth: payload.dateOfBirth ?? existingProfile?.dateOfBirth ?? "",
    physicalAddress: payload.physicalAddress ?? existingProfile?.physicalAddress ?? "",
    mobileNumber: payload.mobileNumber ?? existingProfile?.mobileNumber ?? "",
    privateNotes: payload.privateNotes ?? existingProfile?.privateNotes ?? "",
    delegateEmail:
      payload.delegateEmail === null
        ? ""
        : payload.delegateEmail ?? existingProfile?.delegateEmail ?? "",
    status: payload.status ?? existingProfile?.status ?? "active",
    avatarImage: payload.avatarImage ?? existingProfile?.avatarImage ?? ""
  });

  const nextDelegateEmail = profile.delegateEmail?.trim().toLowerCase() ?? "";

  if (payload.delegateEmail !== undefined && nextDelegateEmail !== previousDelegateEmail) {
    const timestamp = new Date().toISOString();
    const notifications: AppNotification[] = [];

    if (nextDelegateEmail) {
      const delegateName = findDisplayName(nextDelegateEmail, profile.delegateEmail);
      notifications.push(
        {
          id: `notif-${Date.now()}-delegate-app`,
          title: `${user.name} delegated coverage`,
          detail: `${user.name} set ${delegateName} as delegate cover inside My Profile.`,
          channel: "in-app",
          audience: "admins",
          createdAt: timestamp,
          importance: "informational",
          tone: "warning"
        },
        {
          id: `notif-${Date.now()}-delegate-telegram`,
          title: "Telegram delegate alert",
          detail: `${user.name} delegated coverage to ${delegateName}.`,
          channel: "telegram",
          audience: "admins",
          createdAt: timestamp,
          importance: "informational",
          tone: "default"
        }
      );
    } else if (previousDelegateEmail) {
      const previousDelegateName = findDisplayName(previousDelegateEmail, existingProfile?.delegateEmail);
      notifications.push(
        {
          id: `notif-${Date.now()}-undelegate-app`,
          title: `${user.name} removed delegate cover`,
          detail: `${user.name} removed ${previousDelegateName} as delegate cover inside My Profile.`,
          channel: "in-app",
          audience: "admins",
          createdAt: timestamp,
          importance: "informational",
          tone: "default"
        },
        {
          id: `notif-${Date.now()}-undelegate-telegram`,
          title: "Telegram undelegate alert",
          detail: `${user.name} removed ${previousDelegateName} as delegate.`,
          channel: "telegram",
          audience: "admins",
          createdAt: timestamp,
          importance: "informational",
          tone: "default"
        }
      );
    }

    if (notifications.length > 0) {
      await addAdminNotifications(notifications);
    }
  }

  return NextResponse.json({ item: profile });
}
